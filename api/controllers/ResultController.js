/**
 * ResultsController
 *
 * @description :: Server-side logic for managing results
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  // TODO disable unused REST routes aka blueprints

  find: function(req, res) {
    var
      datasetId = req.param('datasetId'),
      profiler = req.param('profiler')
      histogram = req.param('histogram'),
      key = req.param('key'),
      limit = req.param('limit');

    if (!datasetId) return res.badRequest("Missing datasetId");

    // Filter on dataset deleted flag before returning results
    var datasetFilter = {id: datasetId, deleted: false};
    Dataset.count(datasetFilter).exec(function(err, count){
      if(count == 0) return res.ok([]);

      var resultFilter = {dataset: datasetId, histogram: null}, sort;
      if (histogram) {
        resultFilter.histogram = histogram;
        resultFilter.key = key;
        sort = limit ? "count desc" : "value asc";
      }
      console.log("Filtering result using", resultFilter, sort, limit);
      Result.find({where: resultFilter, sort: sort, limit: limit})
      .exec(function(err, results){
        return err ? res.serverError(err) : res.json(results);
      })
    })
  }

};

