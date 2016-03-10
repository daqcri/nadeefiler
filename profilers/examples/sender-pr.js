#!/usr/bin/env node

console.log("Staring AMQP sender...");

var amqp = require('amqplib');

var AMQP_CONN = process.env.CLOUDAMQP_URL || "amqp://localhost";

console.log("Connecting to AMQP server at %s...", AMQP_CONN);
amqp.connect(AMQP_CONN).then(function(conn) {
  console.log("Connected to %s", AMQP_CONN);
  var ok = conn.createChannel()
  ok = ok.then(function(ch) {
    var q = 'queue1';
    ch.assertQueue(q, {durable: true});
    var i = 0;
    var tenDots = "..........";
    setInterval(function(){
      var dots = tenDots.substring(Math.floor(Math.random() * 10));
      var msg = "Hello World message #" + (i++) + " to wait" + dots;
      ch.sendToQueue(q, new Buffer(msg), {persistent: true});
      console.log("sent msg " + msg);
    }, 500);
  });
  return ok;
  //setTimeout(function() { conn.close(); process.exit(0) }, 2000);
}, console.warn);

