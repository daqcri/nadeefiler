/**
 * TuplesController
 *
 * @description :: Server-side logic for managing tuples
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	// TODO disable unused REST routes aka blueprints

  find: function(req, res) {
    var 
      datasetId = req.param('datasetId'),
      pageNumber = req.param('pageNumber') || 1,
      pageSize = req.param('pageSize') || 10,
      sortColumn = req.param('sortColumn') || 'createdAt',
      sortDirection = req.param('sortDirection') || 'ASC';

    if (!datasetId) return res.serverError("Missing datasetId");

    Tuple.find({dataset: datasetId})
    .sort(sortColumn + " " + sortDirection)
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize)
    .exec(function(err, tuples){
      return res.json(tuples);
    })
  }

};

