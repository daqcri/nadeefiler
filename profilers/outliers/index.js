var _ = require('lodash');
var Promise = require("bluebird");
var request = require('request');
var fs = require('fs');
var config = require('./config');

var _resultsCatcher,
    _dataset,
    _profileParams;

module.exports = {
  configure: function(resultsCatcher, dataset, options) {
    _resultsCatcher = resultsCatcher;
    if (options !== null && typeof options === 'object'){
        _profileParams = options;
        _profileParams.input = 'datasets/' + dataset;
    }
    _dataset = dataset;
  },
  onFile: function(csv) {
      return new Promise(function(resolve, reject){
          if (_profileParams !== null && typeof _profileParams === 'object'){
              var r = request.post(config.API_BASE_URL + '/datasets/upload', function optionalCallback (uploadError, uploadResponse, uploadBody) {
                  if (uploadError) {
                      reject(uploadError);
                  }
                  request.post({url:config.API_BASE_URL + '/outliers/detect', json: _profileParams}, function (error, response, body) {
                      if (!error && response.statusCode == 200) {
                          _.each(body['rows'], function(result){
                              _resultsCatcher.write(result);
                          });
                          resolve();
                      } else{
                          reject(error);
                      }
                  });
              });
              var form = r.form();
              form.append('datasetId', _dataset);
              form.append('file', fs.createReadStream(csv));
          }
          else{
              reject();
          }
      });
  },
  onFinish: function() {
      _resultsCatcher.end();
  }
};

