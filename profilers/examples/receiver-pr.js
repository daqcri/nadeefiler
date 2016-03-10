#!/usr/bin/env node

console.log("Staring AMQP receiver...");

var amqp = require('amqplib');

var AMQP_CONN = process.env.CLOUDAMQP_URL || "amqp://localhost";

console.log("Connecting to AMQP server at %s...", AMQP_CONN);
amqp.connect(AMQP_CONN).then(function(conn) {
  console.log("Connected to %s", AMQP_CONN);
  var ok = conn.createChannel();
  ok.then(function(ch) {
    var q = 'queue1';
    ch.assertQueue(q, {durable: true});
    ch.prefetch(1); // don't dispatch more than 1 job to me at a time
    console.log("Waiting for messages in %s. To exit press CTRL+C", q);
    ch.consume(q, function(msg) {
      var task = msg.content.toString();
      console.log("Received %s", task);
      var secs = task.split(".").length - 1;
      setTimeout(function(){
        console.log("Handled %s", task);
        ch.ack(msg);
      }, secs * 1000);
    }, {noAck: false});
  });
  return ok;
}, console.warn);

