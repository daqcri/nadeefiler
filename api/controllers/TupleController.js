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
      sortColumn = req.param('sortColumn') || Tuple.ORDER_COLUMN,
      sortDirection = req.param('sortDirection') || 'ASC';

    if (!datasetId) return res.badRequest("Missing datasetId");

    var filter = {dataset: datasetId};
    filter[Tuple.ORDER_COLUMN] = {'$gt': (pageNumber - 1) * pageSize};

    Tuple
      .find(filter)
      .sort(sortColumn + " " + sortDirection)
      .limit(pageSize)
      .exec(function(err, tuples){
        return res.json(tuples);
      })
  }

};

