/**
 * DatasetController
 *
 * @description :: Server-side logic for managing datasets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var _ = require('lodash');

module.exports = {
	
  create: function(req, res) {
    var invalidRows = {};
    var files = _.find(req.file('files'), function(param){return _.isArray(param) && param.length > 0})
    if (!files) {
      return res.serverError("No files uploaded!");
    }
    var datasets = _.map(files, function(file){
      return {
        name: file.stream.filename
      }
    });
    
    Dataset.create(datasets, function(err, datasets){
      if (err) {
        return res.serverError(err);
      }

      // pivot datasets on name
      datasets = _.reduce(datasets, function(hash, dataset){
        hash[dataset.name] = dataset;
        return hash;
      }, {});

      req.file('files').upload({
        adapter: require('skipper-csv'),
        csvOptions: {delimiter: ',', columns: true},
        rowHandler: function(row, fd, file){
          row.dataset = datasets[file.filename].id;

          // console.log(fd, row);
          // TODO may buffer records and create in chunks
          Tuple.create(row).exec(function createCB(err, tuple){
            if (err) {
              if (invalidRows[fd])
                invalidRows[fd] = invalidRows[fd] + 1;
              else
                invalidRows[fd] = 1;
            }
          });
        }
      }, function (err, files) {
        if (err)
          return res.serverError(err);

        return res.json({
          message: "Uploaded " + files.length + " CSV files!",
          files: files,
          invalidRows: invalidRows
        });

      });
    });

  }

};

