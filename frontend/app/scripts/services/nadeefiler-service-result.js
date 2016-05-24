angular.module('nadeefiler.service.result', [])

.factory('NSResult', function(ENV, $resource) {

  return $resource(
    ENV.API_BASE_URL + '/results?datasetId=:datasetId&key=:key&histogram=:histogram',
    {
      datasetId: '@id'
    }
  );

});