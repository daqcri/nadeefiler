/**
 * TuplesController
 *
 * @description :: Server-side logic for managing tuples
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	// TODO disable unused REST routes aka blueprints

  find: function(req, res) {
    var datasetId = req.param('datasetId');
    if (!datasetId) return res.serverError("Missing datasetId");

    Tuple.find({dataset: datasetId}).sort("createdAt").exec(function(err, tuples){
      return res.json(tuples);
    })
  }

};

