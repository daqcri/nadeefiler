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

    var filter = {dataset: datasetId, histogram: null}, sort;
    if (histogram) {
      filter.histogram = histogram;
      filter.key = key;
      sort = limit ? "count desc" : "value asc";
    }
    console.log("Filtering result using", filter, sort, limit);
    Result.find({where: filter, sort: sort, limit: limit})
    .exec(function(err, results){
      return err ? res.serverError(err) : res.json(results);
    })
  }
	
};

