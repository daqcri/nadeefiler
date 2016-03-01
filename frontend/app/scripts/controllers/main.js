'use strict';

/**
 * @ngdoc function
 * @name frontendApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the frontendApp
 */
angular.module('frontendApp')
  .controller('MainCtrl', function($scope, $resource, ENV, Upload, $timeout) {
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

    var Dataset = $resource(
      ENV.API_BASE_URL + '/datasets/:datasetId?projectId=:projectId',
      {
        datasetId: '@id'
      }
    );

    var Tuple = $resource(
      ENV.API_BASE_URL + '/tuples?datasetId=:datasetId',
      {
        datasetId: '@id'
      }
    );

    Project.query(function(projects){
      $scope.projects = projects;
    });

    $scope.addProject = function () {
      var project = new Project({name: $scope.newProjectName});
      project.$save(function(project){
        $scope.projects.push(project);
        $scope.selectProject(project);
      });
      $scope.newProjectName = '';
    };

    $scope.removeProject = function($event, project, index) {
      project.$remove(function(){
        $scope.projects.splice(index, 1);
        if (project === $scope.selectedProject) {
          $scope.selectProject(null);
        }
      });
      $scope.preventDefault($event);
    };

    $scope.selectProject = function(project) {
      $scope.selectedProject = project;
      if (project) {
        Dataset.query({projectId: project.id}, function(datasets){
          $scope.datasets = datasets;
          $scope.selectDataset(null);
        });
      }
    };

    $scope.selectDataset = function(dataset, $event) {
      $scope.selectedDataset = dataset;
      if (dataset) {
        Tuple.query({datasetId: dataset.id}, function(tuples){
          $scope.datasetGrid.data = tuples;
        });
      }
      $scope.preventDefault($event);
    };

    $scope.datasetGrid = {
    }

    $scope.widgets = [
      { sizeX: 6, sizeY: 1, row: 0, col: 0, type: 'data', title: 'Raw data view' },
      { sizeX: 2, sizeY: 0, row: 1, col: 0, type: 'raw', title: 'Raw widget' },
      { sizeX: 1, sizeY: 0, row: 1, col: 3 }
    ];

    $scope.gridsterOpts = {
        columns: 6, // the width of the grid, in columns
        pushing: true, // whether to push other items out of the way on move or resize
        floating: true, // whether to automatically float items up so they stack (you can temporarily disable if you are adding unsorted items with ng-repeat)
        swapping: true, // whether or not to have items of the same size switch places instead of pushing down if they are the same size
        width: 'auto', // can be an integer or 'auto'. 'auto' scales gridster to be the full width of its containing element
        colWidth: 'auto', // can be an integer or 'auto'.  'auto' uses the pixel width of the element divided by 'columns'
        rowHeight: 'match', // can be an integer or 'match'.  Match uses the colWidth, giving you square widgets.
        margins: [10, 10], // the pixel distance between each widget
        outerMargin: true, // whether margins apply to outer edges of the grid
        isMobile: true, // stacks the grid items if true
        mobileBreakPoint: 600, // if the screen is not wider that this, remove the grid layout and stack the items
        mobileModeEnabled: true, // whether or not to toggle mobile mode when screen width is less than mobileBreakPoint
        minColumns: 1, // the minimum columns the grid must have
        minRows: 2, // the minimum height of the grid, in rows
        maxRows: 100,
        defaultSizeX: 2, // the default width of a gridster item, if not specifed
        defaultSizeY: 1, // the default height of a gridster item, if not specified
        minSizeX: 1, // minimum column width of an item
        maxSizeX: null, // maximum column width of an item
        minSizeY: 1, // minumum row height of an item
        maxSizeY: null, // maximum row height of an item
        resizable: {
           enabled: true,
           handles: ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw']
        },
        draggable: {
           enabled: true, // whether dragging items is supported
           handle: '.my-class' // optional selector for resize handle
        }
    };

    $scope.toggleWidget = function(widget) {
      if (!$scope.selectedDataset) return null;

      switch(widget.type) {
        case 'data':
        case 'raw':
          return true;
        default:
          return false;
          // TODO: toggle widget based on its type/status
      }
    }

    $scope.removeWidget = function(widget, index) {
      $scope.widgets.splice(index, 1);
    };

    $scope.preventDefault = function($event) {
      if ($event) {
        $event.preventDefault();
        $event.stopPropagation();
      }
    };

    $scope.alerts = [];
    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    }

    $scope.uploadFiles = function (files) {
      $scope.uploadedFiles = files;
      if (files && files.length) {
        Upload.upload({
          url: ENV.API_BASE_URL + '/datasets',
          data: {projectId: $scope.selectedProject.id, files: files},
          arrayKey: ''
        }).then(function (response) {
          $scope.alerts.push({type: 'success', message: response.data.message});
          $scope.datasets = $scope.datasets.concat(response.data.datasets);
        }, function (response) {
          $scope.alerts.push({type: 'danger', message: 'Error uploading files (' + response.status + ')'});
        }, function (evt) {
          $scope.uploadProgress = 
            Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
        });
      }
    };

  });
