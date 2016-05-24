angular.module('nadeefiler.services', [
  'nadeefiler.service.project',
  'nadeefiler.service.dataset',
  'nadeefiler.service.tuple',
  'nadeefiler.service.result'
])

.factory('nadeefilerServices', function(
  NSProject, NSDataset, NSTuple, NSResult) {

  return {
    Project: NSProject,
    Dataset: NSDataset,
    Tuple: NSTuple,
    Result: NSResult
  };
});