'use strict';

/**
 * @ngdoc function
 * @name frontendApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the frontendApp
 */
angular.module('frontendApp')
  .controller('MainCtrl', function($scope, $rootScope, $resource, ENV, Upload, uiGridConstants, lodash) {
    // prepare RESTful resources
    // TODO: move into a factory

    var _ = lodash;

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

    var Tuple = $resource(
      ENV.API_BASE_URL + '/tuples?datasetId=:datasetId',
      {
        datasetId: '@id'
      }
    );

    var Result = $resource(
      ENV.API_BASE_URL + '/results?datasetId=:datasetId',
      {
        datasetId: '@id'
      }
    );

    // sockets connection
    // TODO jshint complains about io being undefined
    var sailsSocket = io.sails.connect(ENV.SOCKETIO_BASE_URL);
    sailsSocket.on('connect', function() {
      console.log("Socket connected!");
    });
    sailsSocket.on('profilerResults', function(results) {
      console.log("Received socket data for event 'profilerResults'", results);
      var datasetId = results[0].dataset; // we assume all results belong to the same dataset
      var dataset = _.find($scope.datasets, function(dataset){return dataset.id === datasetId});
      if (dataset && dataset.results && results.length > 0) { // merge results only if dataset.results has been requested before fully
        _.assign(dataset.results, adaptDatasetResults(results, dataset.count));
        console.log("Dataset with new results", dataset);
        $scope.$apply();  // because sailsSocket.on happens outside angular scope
      }
    });

    var socketCommand = function(url) {
      console.log("requesting socket via url: " + url);
      sailsSocket.get(ENV.API_BASE_URL + url, function responseFromServer (body, response) {
        console.log("The server responded with status " + response.statusCode + " and said: ", body);
      });
    }

    var socketSubscribe = function(project) {
      socketCommand('/projects/subscribe/' + project.id);
    };

    var socketUnsubscribe = function(project) {
      socketCommand('/projects/unsubscribe/' + project.id);
    };

    var adaptDatasetResults = function(results, datasetCount) {
      // pivot results over "profiler" key
      var groups = _.groupBy(results, function(result){return result.profiler;});
      // TODO isolate messystreams logic in its module
      if (groups.messystreams) {
        groups.messystreams = _.map(groups.messystreams, function(result){
          return {key: result.key, types: resultSorter(result, datasetCount)}
        })
      }
      return groups;
    };

    var resultSorter = function(result, datasetCount) {
      return _(result)
        .keys()
        .without('key', 'profiler', '$$hashKey', '_id', 'createdAt', 'dataset')
        .map(function(k){return {name: k, count: result[k], percentage: Math.round(result[k]*100/datasetCount)}})
        .filter(function(o){return o.count !== 0})
        .sortBy('count')
        .value();
    }

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
      if ($scope.selectedProject === project) {
        console.log("selecting same project, doing nothing");
        return;
      }

      if ($scope.selectedProject)
        socketUnsubscribe($scope.selectedProject);

      $scope.selectedProject = project;
      if (project) {
        Dataset.query({projectId: project.id}, function(datasets){
          $scope.datasets = datasets;
          $scope.selectDataset(null);
          socketSubscribe(project);
        });
      }
    };

    $scope.selectDataset = function(dataset, index, $event) {
      $scope.selectedDataset = dataset;
      $scope.selectedDatasetIndex = index;

      if (dataset) {
        $scope.datasetGrid.totalItems = dataset.count;
        $scope.datasetGrid.columnDefs = [];
        paginationOptions.sort = null;
        // paginationOptions.pageNumber = 1;
        // $scope.gridApi.pagination.seek(1);
        getPage();
        // request dataset results
        if (!dataset.results) {
          Result.query({
            datasetId: dataset.id
          }, function(results){
            dataset.results = adaptDatasetResults(results, dataset.count);
          });
        }
      }
      $scope.preventDefault($event);
    };

    $scope.deleteDataset = function() {
      if ($scope.selectedDataset) {
        $scope.selectedDataset.$delete(function(){
          $scope.datasets.splice($scope.selectedDatasetIndex, 1);
          $scope.selectDataset(null);
        });
      }
    };

    $scope.profileDataset = function() {
      if ($scope.selectedDataset) {
        Dataset.profile({}, $scope.selectedDataset);
      }
    };

    var paginationOptions = {
      pageNumber: 1,
      pageSize: 10,
      sort: null
    };

    var getPage = function() {

      $scope.loadingData = true;

      Tuple.query({
        datasetId: $scope.selectedDataset.id,
        pageNumber: paginationOptions.pageNumber,
        pageSize: paginationOptions.pageSize,
        sortColumn: paginationOptions.sort ? paginationOptions.sort.col : null,
        sortDirection: paginationOptions.sort ? paginationOptions.sort.dir : null
      }, function(tuples){
        $scope.datasetGrid.data = tuples;
        $scope.gridApi.core.notifyDataChange(uiGridConstants.dataChange.ALL);
        $scope.loadingData = false;
      });
    };

    $scope.datasetGrid = {
      paginationPageSizes: [10, 25, 50, 100],
      paginationPageSize: 10,
      useExternalPagination: true,
      useExternalSorting: true,
      onRegisterApi: function(gridApi) {
        $scope.gridApi = gridApi;
        gridApi.core.on.sortChanged($scope, function(grid, sortColumns) {
          if (sortColumns.length === 0) {
            paginationOptions.sort = null;
          } else {
            paginationOptions.sort = {
              col: sortColumns[0].name,
              dir: sortColumns[0].sort.direction
            };
          }
          getPage();
        });
        gridApi.pagination.on.paginationChanged($scope, function (newPage, pageSize) {
          paginationOptions.pageNumber = newPage;
          paginationOptions.pageSize = pageSize;
          getPage();
        });    
      },
    };

    // TODO put all widget definitions here
    // later define in separate modular files
    $scope.widgets = [
      { sizeX: 3, sizeY: 2, row: 0, col: 0, type: 'datatypes', title: 'Data types' },
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

    // TODO embed toggle logic in each widget definition module
    $scope.toggleWidget = function(widget) {
      if (!$scope.selectedDataset) {return null;}

      switch(widget.type) {
        case 'data':
        case 'raw':
          return true;
        case 'datatypes':
          var results = $scope.selectedDataset.results;
          return results && results.messystreams;
        default:
          return false;
          // TODO: toggle widget based on its type/status
      }
    };

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
    };

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

    /* NOT WORKING! 
    $rootScope.$on('gridster-resized', function(sizes, gridster) {
      console.log('gridster-resized', sizes, gridster);
    })

    $rootScope.$on('gridster-item-initialized', function(item) {
      console.log(item);
    })

    $rootScope.$on('gridster-item-resized', function(item) {
      console.log(item);
    })
    */

  //   $scope.$watch('widgets', function(widgets){
  //     // var dataWidgets = _.filter(widgets, function(widget){
  //     //   return widget.type == 'data'}
  //     // );

  //     // TODO CONSIDER MARGIN WIDTHS
  //     // TODO handle instead in gridster/window resize
  //     $scope.widgetContentHeightUnit = angular.element(document.querySelector('div[gridster]'))[0].offsetWidth / $scope.gridsterOpts.columns;
  //     console.log("widgetContentHeightUnit", $scope.widgetContentHeightUnit);
  // }, true);

  // $scope.widgetContentHeight = function(widget) {
  //   var newHeight = Math.floor(widget.sizeY * $scope.widgetContentHeightUnit) - 40 - 2;
  //   if (widget.type == 'data') {
  //     newHeight -= 26;  // pagination toolbar
  //   }
  //   console.log("some widget height", newHeight);
  //   // $scope.gridApi.core.notifyDataChange(uiGridConstants.dataChange.ALL);
  //   return newHeight;
  // }

  })

  ;