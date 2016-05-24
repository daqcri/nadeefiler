angular.module('nadeefiler.service.dataset', [])

.factory('NSDataset', function(ENV, $resource) {

  return $resource(
    ENV.API_BASE_URL + '/datasets/:action/:datasetId?projectId=:projectId',
    {
      datasetId: '@id'
    },
    {
      profile: {
        method: 'PUT',
        params: {action: 'profile'}
      }
    }
  );

});