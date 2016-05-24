angular.module('nadeefiler.services', [
  'nadeefiler.service.project',
  'nadeefiler.service.dataset'
])

.factory('nadeefilerServices', function(
  NSProject, NSDataset) {

  return {
    Project: NSProject,
    Dataset: NSDataset
  };
});