/**
 * DatasetController
 *
 * @description :: Server-side logic for managing datasets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var _ = require('lodash');

module.exports = {
	
  create: function(req, res) {
    // raise connection timeout to 10 minutes for large uploads
    req.connection.setTimeout(10 * 60 * 1000);

    var invalidRows = {},
        datasets = {},
        totalRows = {};

    req.file('files').upload({
      adapter: require('skipper-csv'),
      csvOptions: {delimiter: ',', columns: true},
      rowHandler: function(row, fd, file){
        var createTuple = function(row) {
          row.dataset = fd;
          Tuple.create(row).exec(function(err){
            if (err) return res.serverError(err);
          });
        }

        if (totalRows[fd])
          totalRows[fd] = totalRows[fd] + 1;
        else
          totalRows[fd] = 1;

        if (datasets[fd]) {
          createTuple(row);
        }
        else {
          datasets[fd] = 1;
          Dataset.create({
            id: fd,
            name: file.filename,
            project: req.param('projectId')
          }).exec(function(err, dataset){
            // we are not using findOrCreate because it is not necessarily atomic
            // https://github.com/balderdashy/waterline/issues/929
            // the solution here is to keep track of datasets by fd
            // tuples could be created even before datasets are created
            if (err) return res.serverError(err);
            datasets[fd] = dataset;
            createTuple(row);
          })
        }
      }
    },
    function (err, files) {
      if (err) return res.serverError(err);

      return res.json({
        message: "Uploaded " + files.length + " CSV files!",
        files: files,
        totalRows: totalRows
      });
    });
  },

  find: function(req, res) {
    var projectId = req.param('projectId');
    if (!projectId) return res.serverError("Missing projectId");

    Dataset.find({project: projectId}).sort("createdAt").exec(function(err, datasets){

        // persisting count when computed to make future requests faster
        // must be delayed because of async 
        // if (dataset.count == null) {
        //   return Tuple.count({dataset: dataset.id})
        //   .then(function(count){
        //     return Dataset.update(dataset.id, {count: count})
        //     .then(function(updatedDatasets){
        //       return updatedDatasets[0];
        //     })
        //   })
        // }
        // else {
        //   return dataset;
        // }

      var promises = _.map(datasets, function(dataset){
        return Tuple.count({dataset: dataset.id})
        .then(function(count){
          return _.merge(dataset.toJSON(), {count: count})
        })
      });
      return Promise.all(promises).then(function(datasets){
        return res.json(datasets)
      });
    })
  }
};

