#!/usr/bin/env node

/* RESPECTS THESE ENVIRONMENT VARIABLES:

MONGOLAB_URI || 'mongodb://localhost:27017/nadeefiler_dev'
CLOUDAMQP_URL || "amqp://localhost"
AMQP_QUEUE || 'sails'
AMQP_PREFETCH || 3

*/


(function() {
  function connectMongo(url) {
    console.log("Connecting to mongodb at ", url);
    return MongoClient.connect(url)
    .then(function(db){
      console.log("Connected to mongodb");
      return db;
    })
  }

  function connectAMQP(url, queue, prefetch) {
    console.log("Connecting to AMQP server at %s...", url);
    return require('amqplib').connect(url)
    .then(function(conn) {
      console.log("Connected to AMQP server");
      return conn.createChannel()
      .then(function(ch) {
        ch.assertQueue(queue, {durable: true});
        ch.prefetch(prefetch); // don't handle more than n jobs at a time
        console.log("Waiting for messages in '%s' queue prefetching %d at most...", queue, prefetch);
        ch.consume(queue, function(msg) {
          var task = JSON.parse(msg.content);
          var taskId = "task[" + msg.content + "]:" + msg.fields.consumerTag;
          console.log("Received", task);
          console.time(taskId);
          task.replyTo = msg.properties.replyTo;
          task.correlationId = msg.properties.correlationId;
          handle(task)
          .then(function(){
            console.log("Handled", task);
            sendReply(task);
            ch.ack(msg);
          })
          .catch(function(err){
            console.warn("Error handling task", task, err)
            sendReply(_.merge(task, {error: err}));
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
            var filter = {dataset: task.dataset, profiler: task.profiler};
            var dbInsertionPending = 0, resultsCatcherEnded = false;
            var resultsCatcher = new stream.Writable({objectMode: true});
            resultsCatcher.write = function(result) {
              // console.log("Received result: ", JSON.stringify(result));
              _.merge(result, filter, {createdAt: new Date()});
              dbInsertionPending++;
              db.collection('result').insertOne(result)
              .then(function(){
                // if all pending insertions are finished
                // and no more insertions are expected (resultsCatcherEnded)
                // then resolve
                if (--dbInsertionPending === 0 && resultsCatcherEnded)
                  resolve();
              });
              return true;
            }
            resultsCatcher.end = function(){
              // no more insertions are expected (please don't write after end!)
              resultsCatcherEnded = true;
              // if all pending insertions are finished then resolve
              if (dbInsertionPending === 0)
                resolve();
            };
            resultsCatcher.on("error", reject);
            resultsCatcher.on("close", reject);
            // TODO test error/close event
            // TODO rejecting nacks the task, it is sent again indifinetly
            // is this correct or we should report permanent failure?

            db.collection('result').deleteMany(filter)
            .then(function(){
              pipeTuples(task.dataset, profilers[task.profiler], resultsCatcher)
            })
          }
        });
      default:
        Promise.reject("Unknown task of type '%s'", task.type);
    }
  }

  function sendReply(task) {
    amqpChannel.sendToQueue(
      task.replyTo,
      new Buffer(JSON.stringify(task)),
      {correlationId: task.correlationId});
  }

  function pipeTuples(dataset, profiler, resultsCatcher) {
    // create mongo query
    var query = {dataset: dataset},
        projection = {_id: 0, createdAt: 0, updatedAt: 0, dataset: 0};
    projection[TUPLE_ORDER_COLUMN] = 0;

    var readTuples = function(keys) {
      // stream query results
      var collection = db.collection('tuple');
      if (profiler.selector) {
        // custom data selector
        return profiler.selector(db, dataset, keys);
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

    // configure profile first
    if (_.isFunction(profiler.configure)) {
      profiler.configure(resultsCatcher);
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
            .then(profiler.onFinish);
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
        cursor.on("end", profiler.onFinish);
        cursor.stream();
        // TODO test premature resolve (better profiler resolves when all tuples procesed?)
      }
      else if (profiler.onValue) {
        _.each(readTuples(keys), function(cursor, key){
          cursor.on("data", function(value){
            profiler.onValue(key, value);
          });
          cursor.on("end", function(){
            profiler.onFinish(key)
          });
          cursor.stream();
        });
      }
    })
  };

  function loadProfilers(config) {
    // load and validate profilers
    var errors = 0;
    var profilers = _.reduce(config, function(profilers, profilerSpec) {
      var profiler, profilerName;
      if (_.isString(profilerSpec)) {
        profilerName = profilerSpec;
      }
      else {
        profilerName = profilerSpec.module;
        profilers = _.merge(profilers, loadProfilers(profilerSpec.cascade));
      }
      profiler = require("./" + profilerName);
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
  var amqpPrefetch = parseInt(process.env.AMQP_PREFETCH) || 3;
  var amqpConnection, amqpChannel, db;
  var stream = require('stream');
  var profilers = loadProfilers(require('./config'));
  const TUPLE_ORDER_COLUMN = '__order';
  console.log(JSON.stringify(profilers));

  connectMongo(urlMongo)
  .then(function(mongoDb){
    db = mongoDb;
    return connectAMQP(urlAMQP, queue, amqpPrefetch)
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

})();
