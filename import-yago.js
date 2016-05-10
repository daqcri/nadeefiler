#!/usr/bin/env node

var MongoClient = require('mongodb').MongoClient
var parser = require('csv-parse')({
  delimiter: '\t',
  columns: ['subject', 'object']
})
var db, progress = 0, urlMongo = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/nadeefiler_dev';
var finished, pending = 0, timerLabel = "Importing records", insertBuffer = []
const INSERT_BUFFER_MAX = 1000

process.stdin.setEncoding('utf8');

var lastSubject = null, lastSubjectObjects = null

parser.on('readable', function(){
  var record
  while(record = parser.read()){
    if (lastSubject === record.subject)
      lastSubjectObjects.push(normalize(record.object))
    else {
      if (lastSubject) writeSubjectWithObjects(lastSubject, lastSubjectObjects)
      lastSubject = record.subject
      lastSubjectObjects = [normalize(record.object)]
    }
  }
});

parser.on('error', function(err){
  console.error(err.message);
});

parser.on('finish', function(){
  writeSubjectWithObjects(lastSubject, lastSubjectObjects, true)
  finished = true
});

function normalize(string) {
  // normalize by removing <>, converting _ to space
  return string.replace(/^<(.+)>$/, '$1').replace(/_/g, ' ')
}

function writeSubjectWithObjects(subject, subjectObjects, flush) {
  var tuple = {
    subject: normalize(subject.toLowerCase()),
    objects: subjectObjects
  }
  insertBuffer.push(tuple)
  pending++
  var insertBufferLength = insertBuffer.length
  if (insertBufferLength === INSERT_BUFFER_MAX || flush) {
    // insert into mongodb
    db.collection('yagoSimpleTypes').insertMany(insertBuffer)
    .then(function(){
      pending -= insertBufferLength
      progress += insertBufferLength
      process.stdout.write("\r" + progress)
      if (finished && pending === 0) {
        process.stdout.write("\n")
        console.timeEnd(timerLabel)
        process.exit(0)
      }
    })
    insertBuffer = []
  }
}

function connectMongo(url) {
  console.log("Connecting to mongodb at", url);
  return MongoClient.connect(url)
  .then(function(db){
    console.log("Connected to mongodb");
    return db;
  })
}

connectMongo(urlMongo)
.then(function(mongoDb){
  db = mongoDb;
  console.time(timerLabel)
  console.log("Importing *SORTED* tsv records <subject <TAB> object> from stdin...")
  process.stdin.pipe(parser)
})
.catch(function(err) {
  console.error(err);
  process.exit(1);
});

