var _ = require('lodash');
var Promise = require("bluebird");
var child_process = require("child_process");
var keys;

var parseRawResults = function(rawResults) {
  return _.map(_.compact(rawResults.split("\n")), function(columnResults) {
    return _.reduce(_.compact(columnResults.split("; ")), function(hash, typeResult){
      var pair = typeResult.split(":");
      return pair.length == 2 ? _.set(hash, pair[0], parseFloat(pair[1])) : _.set(hash, "key", typeResult);
    }, {});
  });
}

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
    var file = __dirname + '/run.py',
        args = ['-f', csv],
        options = {cwd: __dirname};
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
          _.each(parseRawResults(stdout), function(result){
            _resultsCatcher.write(result);
          });
          resolve();
        }
      });
    })
  },
  onFinish: function() {
    _resultsCatcher.end();
  }
};
