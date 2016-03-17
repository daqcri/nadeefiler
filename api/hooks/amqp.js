module.exports = function amqp(sails) {

  var channel, replyToQueue;

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
          channel = ch;
          var q = sails.config.amqp.queue;
          ch.assertQueue(q, {durable: true})
          console.log("AMQP assertQueue: '%s'", q);
          ch.assertQueue('', {exclusive: true})
          .then(function(q) {
            replyToQueue = q.queue;
            console.log("AMQP assertQueue (replyTo): ", replyToQueue);
            return replyToQueue;
          })
          .then(function(q){
            ch.consume(q, function(msg){
              console.log("Received reply from worker: " + msg.content);
              // send back to client through socket
              sails.sockets.broadcast(msg.properties.correlationId, "profilerResults", JSON.parse(msg.content.toString()));
            }, {noAck: true});
            cb();
          }, function(err){
            console.error(err);
            process.exit(1);
          })
        });
        return ok;
      }, function(err){
        console.error(err);
        process.exit(1);
      });
    },

    publish: function(msg, options) {
      var msgOptions = {persistent: true, replyTo: replyToQueue};
      if (_.isObject(msg)) {
        msgOptions.contentType = 'application/json';
        msg = JSON.stringify(msg);
      }
      var q = sails.config.amqp.queue;
      channel.sendToQueue(q, new Buffer(msg), _.merge(msgOptions, options));
    }
  };
}