var _ = require('lodash');
var Promise = require("bluebird");

// TODO catch js errors in this file

var _resultsCatcher;

module.exports = {
  configure: function(resultsCatcher, options) {
    _resultsCatcher = resultsCatcher;
  },
  selector: function(db, dataset, keys) {
    // TODO: this is a test selector that just limits results by 3
    _.each(keys, function(key){
      _resultsCatcher.write({key: key});
    });
    return db.collection('tuple').find({dataset: dataset}).limit(3);
  },
  onTuple: function(tuple) {
    console.log("fdminer", tuple);
  },
  onFinish: function() {
    console.log("in fdminer onFinish")
    _resultsCatcher.end();
  }
};
