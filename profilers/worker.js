#!/usr/bin/env node

function connectMongo(url) {
  console.log("Connecting to mongodb at ", url);
  return MongoClient.connect(url)
  .then(function(db){
    console.log("Connected to mongodb");
    return db;
  })
}

function connectAMQP(url, queue) {
  console.log("Connecting to AMQP server at %s...", url);
  return require('amqplib').connect(url)
  .then(function(conn) {
    console.log("Connected to AMQP server");
    return conn.createChannel()
    .then(function(ch) {
      ch.assertQueue(queue, {durable: true});
      ch.prefetch(3); // don't handle more than n jobs at a time
      console.log("Waiting for messages in %s. To exit press CTRL+C", queue);
      ch.consume(queue, function(msg) {
        var task = JSON.parse(msg.content);
        var taskId = "task-" + msg.fields.consumerTag;
        console.log("Received", task);
        console.time(taskId);
        handle(task)
        .then(function(){
          console.log("Handled", task);
          // TODO send back results
        })
        .catch(function(err){
          console.warn("Error handling task", task, err)
          // TODO send back error
        })
        .finally(function(){
          console.timeEnd(taskId);
          ch.ack(msg);
        })
      }, {noAck: false});
      return {amqpConnection: conn, amqpChannel: ch};
    });
  }, console.warn);
}

function handle(task) {
  switch(task.type) {
    case 'profile-all':
      // requeue all profilers
      _.forEach(profilers, function(profiler, key){
        amqpChannel.sendToQueue(queue, new Buffer(JSON.stringify({
          type: 'profile',
          profiler: key,
          dataset: task.dataset
        })), {
          persistent: true,
          contentType: 'application/json'
        });
      })
      return Promise.resolve(true);
    case 'profile':
      return new Promise(function(resolve, reject){
        tmp.tmpName(function (err, filename) {
          // TODO promisify tmpName to catch error later
          if (err) reject("Error creating temporary file: " + err);
          console.log("Generated temporary filename at: " + filename);
          var write = fs.createWriteStream(filename);
          console.time("pipeTuples");
          pipeTuples(task.dataset, write)
          .then(function(){
            console.timeEnd("pipeTuples");
            var func = profilers[task.profiler];
            if (!func) reject("Unknown profiler: " + task.profiler);
            console.log("Running profiler " + task.profiler);
            // TODO benchmark running time for profiler
            return func(filename).then(resolve);
          })
          .catch(reject);
        });
      });
  }
}

function pipeTuples(dataset, destination) {
  return new Promise(function(resolve, reject){
    var keys = null;
    destination.on('finish', resolve);

    // create mongo query
    var query = {dataset: dataset},
        projection = {_id: 0, createdAt: 0, updatedAt: 0, dataset: 0};

    // extract header from first tuple
    db.collection('tuple').find(query, {limit: 1}).project(projection).next()
    .then(function(tuple){
      // TODO throw error if tuple is null, make sure the current promise is rejected as well
      if (!tuple)
        reject("Empty dataset");
      else
        return _.keys(tuple);
    })
    .then(function(keys){
      var csvStringify = csvStringifier({header: true, columns: keys})
      // stream query results
      db.collection('tuple').find(query).project(projection)
      .stream({
        transform: function(tuple) { 
          // return columns in the same order for each tuple
          return _.map(keys, function(key){return tuple[key]});
        }
      })
      .pipe(csvStringify)
      .pipe(destination)
    })

  });
};

// TODO move profilers definition in external files, to be easily pluggable
var profilers = {
  messytables: function(csv) {
    var file = __dirname + '/types/messytables/run.py',
        args = ['-f', csv],
        options = {cwd: __dirname + '/types/messytables'};
    return new Promise(function(resolve, reject){
      // TODO optimize execution by rewriting in nodejs using streams
      // However, the advantage of child_process is that it will run
      //   on a differnt cpu on a multi-core machine
      //   but this advantage is not valid on heroku, the solution is more node workers
      child_process.execFile(file, args, options, function(error, stdout, stderr) {
        if (error)
          reject(error);
        else {
          console.log(stdout);
          resolve();  // TODO resolve with result
        }
      });
    })
  }
};

var _ = require('lodash');
var Promise = require("bluebird");
var child_process = require("child_process");
var fs = require('fs');
var tmp = require('tmp');
var MongoClient = require('mongodb').MongoClient;
var csvStringifier = require('csv-stringify');
var urlMongo = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/nadeefiler_dev';
var urlAMQP = process.env.CLOUDAMQP_URL || "amqp://localhost";
var queue = process.env.AMQP_QUEUE || 'sails';
var amqpConnection, amqpChannel, db;

connectMongo(urlMongo)
.then(function(mongoDb){
  db = mongoDb;
  return connectAMQP(urlAMQP, queue)
  .then(function(result){
    amqpChannel = result.amqpChannel;
    amqpConnection = result.amqpConnection;
  })
})
.catch(function(err) {
  console.error(err);
  process.exit(1);
});

// TODO resource management for Promise to:
// 1- db.close();
// 2- amqpConnection.close();

