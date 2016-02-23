'use strict';

/**
 * @ngdoc function
 * @name frontendApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the frontendApp
 */
angular.module('frontendApp')
  .controller('MainCtrl', function($scope, $resource, ENV) {
    // prepare RESTful resources
    // TODO: move into a factory

    var Project = $resource(
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

    Project.query(function(projects){
      $scope.projects = projects;
    });

    $scope.addProject = function () {
      var project = new Project({name: $scope.newProjectName});
      project.$save(function(project){
        $scope.projects.push(project);
      });
      $scope.newProjectName = '';
    };

    $scope.removeProject = function(project, index) {
      project.$remove(function(){
        $scope.projects.splice(index, 1);
      });
    };

  });
