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
      profiler = req.param('profiler');

    if (!datasetId) return res.badRequest("Missing datasetId");

    Result.find({dataset: datasetId})
    .exec(function(err, results){
      return err ? res.serverError(err) : res.json(results);
    })
  }
	
};

