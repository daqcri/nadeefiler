angular.module('nadeefiler.service.tuple', [])

.factory('NSTuple', function(ENV, $resource) {

  return $resource(
    ENV.API_BASE_URL + '/tuples?datasetId=:datasetId',
    {
      datasetId: '@id'
    }
  );

});