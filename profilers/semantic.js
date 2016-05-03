var _ = require('lodash'),
    _db,
    _resultsCatcher,
    scores,
    pendingValues,
    topScores = 10;

function appendResults(key, objects, score, count) {
  _.each(objects, function(object){
    if (scores[key][object])
      scores[key][object] += score * count;
    else
      scores[key][object] = score * count;
  })
}

function pruneScores() {
  return _.map(scores, function(value, key){
    var topObjects = 
      _(value)
      .map(function(score, object){
        return {object: object, score: score}
      })
      .orderBy('score', 'desc')
      .take(topScores)
      .value()
    return {key: key, objects: topObjects}
  })
}

function writeResultsIfFinished() {
  if (--pendingValues === 0) {
    var results = pruneScores()
    _.each(results, _resultsCatcher.write)
    _resultsCatcher.end();
  }
}

module.exports = {
  configure: function(resultsCatcher, options) {
    _resultsCatcher = resultsCatcher;
  },
  selector: function(db, dataset, keys) {
    // init scores
    scores = {}; _db = db; pendingValues = 1 // extra semaphore which will be released in onFinish
    _.forEach(keys, function(key){
      scores[key] = {};
    });

    // return stream of results for this dataset (messystreams profiler results)
    var query = {dataset: dataset, profiler: 'messystreams', histogram: 'string'}
        projection = {_id: 0, value: 1, count: 1, key: 1};
    return db.collection('result')
      .find(query)
      .project(projection);
  },
  onTuple: function(tuple) {
    // console.log("semantic onTuple", tuple.key, tuple.value, tuple.count)
    // consult yago db
    pendingValues++
    _db.collection('yagoSimpleTypes')
      .find({$text: {$search: tuple.value}})
      .project({_id: 0, objects: 1, score: {$meta: "textScore"}})
      .sort({$meta: "textScore"}, -1)
      .limit(topScores)
      .toArray()
      .then(function(results){
        _.each(results, function(result){
          appendResults(tuple.key, result.objects, result.score, tuple.count)
        })
        writeResultsIfFinished();
      })
  },
  onFinish: writeResultsIfFinished
};
