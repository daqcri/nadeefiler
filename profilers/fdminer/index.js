var _ = require('lodash');
var results;

// TODO catch js errors in this file

module.exports = {
  selector: function(mongoCollection, dataset, keys) {
    // TODO: this is a test selector that just limits results by 3
    results = _.map(keys, function(key){
      return {key: key};
    });
    return mongoCollection.find({dataset: dataset}).limit(3);
  },
  onTuple: function(tuple) {
    console.log("fdminer", tuple);
  },
  onFinish: function() {
    return results;
  }
};
