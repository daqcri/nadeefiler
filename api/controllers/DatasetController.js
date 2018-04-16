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
        finishedPromises = [],
        projectId = req.param('projectId');

    req.file('files').upload({
      adapter: require('skipper-csv'),
      csvOptions: {delimiter: ',', columns: true},
      rowHandler: function(row, fd, file){
        var createTuple = function(row, order) {
          row.dataset = fd;
          row[Tuple.ORDER_COLUMN] = order;
          Tuple.create(row).exec(function(err){
            if (err) return res.serverError(err);
          });
        }

        if (totalRows[fd])
          totalRows[fd] = totalRows[fd] + 1;
        else
          totalRows[fd] = 1;

        var order = totalRows[fd];

        if (datasets[fd]) {
          createTuple(row, order);
        }
        else {
          datasets[fd] = 1;
          finishedPromises.push(Dataset.create({
            id: fd,
            name: file.filename,
            project: projectId
          }).then(function(dataset){
            // we are not using findOrCreate because it is not necessarily atomic
            // https://github.com/balderdashy/waterline/issues/929
            // the solution here is to keep track of datasets by fd
            // tuples could be created even before datasets are created
            datasets[fd] = dataset;
            createTuple(row, order);
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
          // profile datasets in background
          Dataset.profile(datasets, projectId);
          // return client response
          return res.json({
            message: "Uploaded " + files.length + " CSV file(s)!",
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
    if (!projectId) return res.badRequest("Missing projectId");
    var datasetFilter = {project: projectId, deleted: false};
    Dataset.find(datasetFilter).sort("createdAt").exec(function(err, datasets){
      return res.json(datasets)
    });
  },

  profile: function(req, res) {
    var datasetId = req.params.id;
    var projectId = req.param('project');
    if (!datasetId) return res.badRequest("Missing trailing /:datasetId ");
    if (!projectId) return res.badRequest("Missing project");
    Dataset.profile(datasetId, projectId);
    return res.ok();
  },

  destroy: function(req, res) {
    var datasetId = req.params.id;
    if (!datasetId) return res.badRequest("Missing datasetId");

    // If dataset already marked as deleted, return 404
    Dataset.findOne({id: datasetId}).exec(function(err, deletedDataset){
      if(!deletedDataset || deletedDataset.deleted) return res.notFound();

      // Otherwise, set deleted flag to true
      Dataset.update({id: datasetId},{deleted: true}).exec(function(err, updatedDataset){
        return (updatedDataset[0] ? res.json(updatedDataset[0]) : res.ok());
      });
    });
  }
};

