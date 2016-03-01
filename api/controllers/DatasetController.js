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
        totalRows = {},
        finishedPromises = [];

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
          finishedPromises.push(Dataset.create({
            id: fd,
            name: file.filename,
            project: req.param('projectId')
          }).then(function(dataset){
            // we are not using findOrCreate because it is not necessarily atomic
            // https://github.com/balderdashy/waterline/issues/929
            // the solution here is to keep track of datasets by fd
            // tuples could be created even before datasets are created
            datasets[fd] = dataset;
            createTuple(row);
            return dataset;
          }))
        }
      }
    },
    function (err, files) {
      if (err) return res.serverError(err);

      return Promise.all(finishedPromises).then(function(datasets){
        // update totals
        var updatePromises = _.map(datasets, function(dataset){
          return Dataset.update(dataset.id, {count: totalRows[dataset.id]})
            .then(function(updatedDatasets){
              return updatedDatasets[0];
            })
        })
        return Promise.all(updatePromises).then(function(datasets){
          return res.json({
            message: "Uploaded " + files.length + " CSV file(s)!",
            files: files,
            totalRows: totalRows,
            datasets: datasets
          });
        })
      }).catch(function(err){
        return res.serverError(err);
      })

    });
  },

  find: function(req, res) {
    var projectId = req.param('projectId');
    if (!projectId) return res.serverError("Missing projectId");

    Dataset.find({project: projectId}).sort("createdAt").exec(function(err, datasets){
      return res.json(datasets)
    });
  }
};

