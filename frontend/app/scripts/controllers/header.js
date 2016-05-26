'use strict';

/**
 * @ngdoc function
 * @name frontendApp.controller:HeaderCtrl
 * @description
 * # HeaderCtrl
 * Controller of the frontendApp
 */
angular.module('header.controller', [
    'nadeefiler.services'
  ])
  .controller('HeaderCtrl', function (
    $scope,
    $rootScope,
    $location,
    Upload,
    ENV,
    debug,
    nadeefilerServices
  ) {

    $scope.debug = debug;

    $scope.isRouteActive = function(route) {
      return route === $location.path();
    }

    $rootScope.preventDefault = function($event) {
      if ($event) {
        $event.preventDefault();
        $event.stopPropagation();
      }
    };

    // project functions

    nadeefilerServices.Project.query(function(projects){
      $scope.projects = projects;
    });

    $scope.addProject = function () {
      var project = new nadeefilerServices.Project({name: $scope.newProjectName});
      project.$save(function(project){
        $scope.projects.push(project);
        $scope.selectProject(project);
      });
      $scope.newProjectName = '';
    };

    $scope.deleteProject = function($event, project, index) {
      project.$delete(function(){
        $scope.projects.splice(index, 1);
        if (project === $scope.selectedProject) {
          $scope.selectProject(null);
        }
      });
      $rootScope.preventDefault($event);
    };

    $scope.selectProject = function(project) {
      if ($scope.selectedProject === project) {
        console.log("selecting same project, doing nothing");
        return;
      }

      $scope.selectedProject = project;

      if (project) {
        nadeefilerServices.Dataset.query({projectId: project.id}, function(datasets){
          $scope.datasets = datasets;
          $scope.selectDataset(null);
        });
      }

      $rootScope.$broadcast('project.selected', project);
    };

    // dataset functions

    $scope.selectDataset = function(dataset, index) {
      $scope.selectedDataset = dataset;
      $rootScope.$broadcast('dataset.selected', dataset);
    };

    $scope.deleteDataset = function($event, dataset, index) {
      dataset.deleting = true;
      dataset.$delete(function(){
        $scope.datasets.splice(index, 1);
        if (dataset === $scope.selectedDataset) {
          $scope.selectDataset(null);
        }
      });
      $rootScope.preventDefault($event);
    };

    $scope.resetDatasetWidgets = function() {
      $rootScope.$broadcast('dataset.reset');
    }

    $scope.profileDataset = function() {
      if ($scope.selectedDataset) {
        nadeefilerServices.Dataset.profile({}, $scope.selectedDataset);
      }
    };

    $scope.alerts = [];
    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    };

    var toResources = function(datasets) {
      return _.map(datasets, function(dataset){
        return new nadeefilerServices.Dataset(dataset);
      })
    }

    $scope.uploadFiles = function(files) {
      $scope.uploadedFiles = files;
      if (files && files.length) {
        $scope.uploadProgress = 0;
        $scope.uploading = true;
        Upload.upload({
          url: ENV.API_BASE_URL + '/datasets',
          data: {projectId: $scope.selectedProject.id, files: files},
          arrayKey: ''
        }).then(function (response) {
          $scope.uploading = false;
          $scope.alerts.push({type: 'success', message: response.data.message});
          $scope.datasets = $scope.datasets.concat(toResources(response.data.datasets));
        }, function (response) {
          $scope.uploading = false;
          $scope.alerts.push({type: 'danger', message: 'Error uploading files (' + response.status + ')'});
        }, function (evt) {
          $scope.uploadProgress =
            Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
        });
      }
    };

  });
