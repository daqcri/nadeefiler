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
      console.log("Waiting for messages in '%s'...", queue);
      ch.consume(queue, function(msg) {
        var task = JSON.parse(msg.content);
        var taskId = "task[" + msg.content + "]:" + msg.fields.consumerTag;
        console.log("Received", task);
        console.time(taskId);
        task.replyTo = msg.properties.replyTo;
        task.correlationId = msg.properties.correlationId;
        handle(task)
        .then(function(results){
          console.log("Handled", task);
          sendReply(task, results);
          ch.ack(msg);
        })
        .catch(function(err){
          console.warn("Error handling task", task, err)
          sendReply(task, null, err);
          ch.nack(msg); // permanent failure? don't nack
        })
        .finally(function(){
          console.timeEnd(taskId);
        })
      }, {noAck: false});
      return {amqpConnection: conn, amqpChannel: ch};
    });
  }, console.warn);
}

function handle(task) {
  switch(task.type) {
    case 'profile':
      return new Promise(function(resolve, reject){
        if (!profilers[task.profiler])
          reject("Unknown profiler: " + task.profiler);
        else {
          console.time("pipeTuples");
          var filter = {dataset: task.dataset, profiler: task.profiler};
          pipeTuples(task.dataset, profilers[task.profiler])
          .then(function(results){
            console.log(results);
            // insertMany results after adding dataset/profiler/timestamp
            _.forEach(results, function(result){
              _.merge(result, filter, {createdAt: new Date()});
            })
            return db.collection('result').deleteMany(filter)
            .then(function(){
              db.collection('result').insertMany(results)
            })
            .then(function(){return results});
          })
          .then(resolve)
          .catch(reject)
          .finally(function(){
            console.timeEnd("pipeTuples");            
          })
        }
      });
    default:
      Promise.reject("Unknown task of type '%s'", task.type);
  }
}

function sendReply(task, results, error) {
  amqpChannel.sendToQueue(
    task.replyTo,
    new Buffer(JSON.stringify(error ? {error: error} : results)),
    {correlationId: task.correlationId});
}

function pipeTuples(dataset, profiler) {
  return new Promise(function(resolve, reject){

    // create mongo query
    var query = {dataset: dataset},
        projection = {_id: 0, createdAt: 0, updatedAt: 0, dataset: 0};

    var readTuples = function(keys) {
      // stream query results
      var collection = db.collection('tuple');
      if (profiler.selector) {
        // custom data selector
        return profiler.selector(collection, dataset, keys);
      }
      else if (profiler.onValue) {
        // default data selector: return all values
        return _.reduce(keys, function(hash, key){
          return _.set(hash, key, collection.find(query).project(_.set({}, key, 1)));
        }, {});
      }
      else {
        // default data selector: return all tuples
        return collection.find(query).project(projection)
        .stream({
          transform: function(tuple) { 
            // return columns in the same order for each tuple
            return _.map(keys, function(key){return tuple[key]});
          }
        });
      }
    }

    // extract header from first tuple
    db.collection('tuple').find(query, {limit: 1}).project(projection).next()
    .then(function(tuple){
      if (!tuple)
        reject("Empty dataset");
      else
        return _.keys(tuple);
    })
    .then(function(keys){
      if (profiler.onFile) {
        var csvStringify = csvStringifier({header: true, columns: keys})
        tmp.tmpNameAsync()
        .then(function(filename){
          console.log("Generated temporary filename at: " + filename);
          var write = fs.createWriteStream(filename);
          write.on('finish', function(){
            profiler.onFile(filename)
            .then(function(){
              resolve(profiler.onFinish());
            })
            .catch(reject);
            // TODO rejecting nacks the task, it is sent again indifinetly
            // is this correct or we should report permanent failure?
          });
          readTuples(keys).pipe(csvStringify).pipe(write);
        })
        .catch(function(err) {
          reject("Error creating temporary file: " + err);
        })
      }
      else if (profiler.onTuple) {
        var cursor = readTuples(keys);
        cursor.on("data", profiler.onTuple);
        cursor.on("end", function(){
          resolve(profiler.onFinish());
        });
        cursor.stream();
        // TODO test premature resolve (better profiler resolves when all tuples procesed?)
      }
      else if (profiler.onValue) {
        Promise.all(_.map(readTuples(keys), function(cursor, key){
          cursor.on("data", function(value){
            profiler.onValue(key, value);
          });
          return new Promise(function(columnResolve, columnReject){
            cursor.on("end", function(){
              var result = profiler.onFinish(key);
              columnResolve(_.merge({key: key}, result));
            });
            // TODO: curson on error reject?
            cursor.stream();
          });
        }))
        .then(resolve);
        // TODO .catch(function(error){})
      }
    })

  });
};

function loadProfilers(config) {
  // load and validate profilers
  var errors = 0;
  var profilers = _.reduce(config, function(profilers, profilerName) {
    var profiler = require("./" + profilerName);
    if (!_.isFunction(profiler.onFinish)) {
      console.error("Profiler '%s' must contain onFinish function that returns profiling results", profilerName);
      errors++;
    }
    if (!_.isFunction(profiler.onFile) && !_.isFunction(profiler.onTuple) && !_.isFunction(profiler.onValue)) {
      console.error("Profiler '%s' must contain one of onFile, onTuple or onValue processor functions", profilerName);
      errors++;
    }
    return _.set(profilers, profilerName, profiler);
  }, {});
  if (errors > 0) process.exit(1);
  return profilers;
}

var _ = require('lodash');
var Promise = require("bluebird");
var fs = require('fs');
var tmp = require('tmp'); Promise.promisifyAll(tmp);
var MongoClient = require('mongodb').MongoClient;
var csvStringifier = require('csv-stringify');
var urlMongo = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/nadeefiler_dev';
var urlAMQP = process.env.CLOUDAMQP_URL || "amqp://localhost";
var queue = process.env.AMQP_QUEUE || 'sails';
var amqpConnection, amqpChannel, db;
var profilers = loadProfilers(require('./config'));
console.log(profilers);

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

