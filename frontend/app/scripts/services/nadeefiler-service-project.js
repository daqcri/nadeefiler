angular.module('nadeefiler.service.project', [])

.factory('NSProject', function(ENV, $resource) {

  return $resource(
    ENV.API_BASE_URL + '/projects/:projectId',
    {
      projectId: '@id'
    },
    {
      update: {
        method: 'PUT'
      }
    }
  );

});