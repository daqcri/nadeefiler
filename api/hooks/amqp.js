module.exports = function amqp(sails) {

  var channel;

  return {
    defaults: {
      amqp: {
        url: "amqp://localhost",
        queue: "sails"
      }
    },
    initialize: function(cb) {
      console.log("Staring AMQP sender...");
      var amqp = require('amqplib');
      var url = sails.config.amqp.url;
      console.log("Connecting to AMQP server at %s...", url);
      amqp.connect(url).then(function(conn) {
        console.log("Connected to %s", url);
        var ok = conn.createChannel()
        ok = ok.then(function(ch) {
          var q = sails.config.amqp.queue;
          ch.assertQueue(q, {durable: true});
          console.log("AMQP assertQueue: ", q);
          channel = ch;
          cb();
        });
        return ok;
      }, console.warn);
    },

    publish: function(msg) {
      var options = {persistent: true};
      if (_.isObject(msg)) {
        options.contentType = 'application/json';
        msg = JSON.stringify(msg);
      }
      var q = sails.config.amqp.queue;
      channel.sendToQueue(q, new Buffer(msg), options);
    }
  };
}