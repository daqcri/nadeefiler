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
    var cmd = './dBoost/dboost/dboost-stdin.py',
    args = ['--histogram', '0.8',  '0.05' ,'--discretestats', '8', '2' , '--field-separator', ',', '-vv', csv];
    options = {cwd: __dirname};
    return new Promise(function(resolve, reject){
      child_process.execFile(cmd, args, options, (error, stdout, stderr) => {
        if (error) {
          console.log(error);
          reject(error);
        }else {
          if (stdout){
             var results = JSON.parse(stdout);
             if ('rows' in results){
                _.each(results['rows'], function(result){
                  _resultsCatcher.write(result);
                });
             }
          }
          resolve();
        }
      });
    })
  },
  onFinish: function() {
    _resultsCatcher.end();
  }
};
