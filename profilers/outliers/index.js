var _ = require('lodash');
var Promise = require("bluebird");
var child_process = require("child_process");

var _resultsCatcher,
    _dataset,
    _profilerParams;

module.exports = {
  configure: function(resultsCatcher, dataset, options) {
    _resultsCatcher = resultsCatcher;
    _dataset = dataset;
    _profilerParams = options;
  },
  onFile: function(csv) {
    var cmd = './dBoost/dboost/dboost-json-stdin.py',
    args = ['--histogram', '0.8',  '0.05' ,'--discretestats', '8', '2' , '--field-separator', ',', '-vv', csv];
    options = {cwd: __dirname};

    return new Promise(function(resolve, reject){
      var received_data = '';
      var dBoost = child_process.spawn(cmd, args, options);
      // add a 'data' event listener for the spawn instance
      dBoost.stdout.on('data', function(data) { received_data += data; });
      // add an 'end' event listener to start processing the output of dBoost
      dBoost.stdout.on('end', function(data) {
        var results = JSON.parse(received_data);
        if ('rows' in results){
          _.each(results['rows'], function(result){
            _resultsCatcher.write(result);
          });
        }
        resolve();
      });
      // when the spawn child process exits, check if there were any errors
      dBoost.on('exit', function(code) {
          if (code != 0) {
              console.log('Failed: ' + code);
              reject(code);
          }
      });
    });
  },
  onFinish: function() {
    _resultsCatcher.end();
  }
};
