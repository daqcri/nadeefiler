'use strict';

/**
 * @ngdoc function
 * @name frontendApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the frontendApp
 */
angular.module('main.controller', [
    'nadeefiler.services'
  ])
  .controller('MainCtrl', function(
    $scope,
    $rootScope,
    $resource,
    ENV,
    uiGridConstants,
    lodash,
    $q,
    highchartsNG,
    nadeefilerServices
  ) {
    // prepare RESTful resources
    // TODO: move into a factory

    var _ = lodash;

    $scope.$on('project.selected', function(event, project){
      if ($scope.selectedProject)
        socketUnsubscribe($scope.selectedProject);

      if (project)
        socketSubscribe(project);

      $scope.selectedProject = project;
    });

    $scope.$on('dataset.selected', function(event, dataset){
      $scope.selectedDataset = dataset;
      $scope.datasetGrid.columnDefs = [];
      // if ($scope.gridApi)
      //   $scope.gridApi.core.notifyDataChange(uiGridConstants.dataChange.ALL);

      if (dataset) {
        $scope.datasetGrid.totalItems = dataset.count;
        paginationOptions.sort = null;
        // paginationOptions.pageNumber = 1;
        // $scope.gridApi.pagination.seek(1);
        getPage().then(function(){
          // request dataset results
          // this is chained after getPage because results needs physical order of keys to sort itself
          if (!dataset.results) {
            getResults(dataset);
          }
        })
        if (!dataset.widgets) {
          $scope.resetDatasetWidgets();
        }
      }

    });

    // sockets connection
    // TODO jshint complains about io being undefined
    var sailsSocket = io.sails.connect(ENV.SOCKETIO_BASE_URL);
    sailsSocket.on('connect', function() {
      console.log("Socket connected!");
    });
    sailsSocket.on('profilerResults', function(task) {
      console.log("Received socket data for event 'profilerResults'", task);
      var datasetId = task.dataset;
      var dataset = _.find($scope.datasets, function(dataset){return dataset.id === datasetId});
      if (dataset) {
        getResults(dataset);
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

    var typesDictionary = {
      "string": "gray",
      "date": "lightgreen",
      "percent": "darkblue",
      "float": "cyan",
      "integer": "blue",
      "boolean": "green",
      "null": "red",
      "semantic": "black"
    }

    var widgetMargin = 10;

    var adaptDatasetResults = function(results, dataset) {
      // pivot results over "profiler" key
      var groups = _.groupBy(results, function(result){return result.profiler;});
      var keys = _.map($scope.datasetGrid.columnDefs, 'name');
      dataset.keys = keys;
      // TODO isolate messystreams logic in its module
      if (groups.messystreams) {
        var unsorted = _(groups.messystreams)
        .map(function(result){
          return {key: cleanKeyName(result.key), types: resultSorter(result, dataset.count), result: result}
        })
        .groupBy('key')
        .value();
        console.log("keys of grid", keys)
        groups.messystreams = _.map(keys, function(key){return unsorted[key][0];})

        // setup widget chart
        var widgets = _.filter(dataset.widgets, function(w){return w.type === 'datatypes'});
        if (widgets.length > 0) {
          widgets[0].chartConfig.xAxis.categories = keys;
          widgets[0].chartConfig.series = _.map(typesDictionary, function(color, type){
            return {
              name: type, color: color,
              data: _.map(keys, function(key){
                return unsorted[key][0].result[type];
              })
            }
          })
        }
      }

      if (groups.semantic) {
        groups.semantic = _.reduce(groups.semantic, function(hash, resource){
          return _.set(hash, resource.key, resource.objects)
        }, {})
      }

      dataset.results = groups;
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

    var getResults = function(dataset) {
      nadeefilerServices.Result.query({
        datasetId: dataset.id
      }, function(results){
        adaptDatasetResults(results, dataset);
      });
    }

    var getHistogram = function(dataset, key, type, limit) {
      var deferred = $q.defer();

      nadeefilerServices.Result.query({
        datasetId: dataset.id,
        histogram: type,
        key: key,
        limit: limit
      }, function(histogram){
        if (!dataset.histograms) dataset.histograms = {};
        if (!dataset.histograms[key]) dataset.histograms[key] = {};
        var sorted = {
          value: histogram, // already sorted by value
          count: _.sortBy(histogram, 'count') // sort by count
        };
        dataset.histograms[key][type] = sorted;
        deferred.resolve(sorted);
      });

      return deferred.promise;
    }

    var createOutliersWidget = function(dataset){
      var widget = {
        sizeX: 2, sizeY: 2, row: 0, col: 2, type: 'outliers',
        title: 'Outliers', vizType: 'list', defaultVizType: 'list',
        chartConfig: {
          // The below properties are watched separately for changes.
          title: {text: ''},
          xAxis: {title: {text: ''}},
          yAxis: {title: {text: ''}},
          useHighStocks: false
        }
      };
      updateWidgetChartSize(widget);
      return widget;
    };

    $scope.outlierClicked = function (event, result) {
      var dataset = $scope.selectedDataset;
      if (!dataset) return;
      _.each(result.fields, function(field){
          $scope.createOutlierHistogramWidget(dataset, field);
      });
      $rootScope.preventDefault(event);
    };

    $scope.createOutlierFeatureWidget = function(dataset, outlier, fields) {
        var widgetTitle = "Features related to " + outlier;
        var widget = {
          sizeX: 2, sizeY: 1, type: 'outlier',
          title: widgetTitle,
          vizType: 'list',
          chartConfig: {
                title: {text: ''},
                xAxis: {title: {text: ''}},
                yAxis: {title: {text: ''}},
                useHighStocks: false
              }
        };
        updateWidgetChartSize(widget);
        dataset.widgets.push(widget);
    };
    $scope.createOutlierHistogramWidget = function(dataset, feature) {
        var widgetTitle =  feature.msg;
        var widget = {
            sizeX: 2, sizeY: 1, type: 'outlierHistogram',
            title: widgetTitle,
            chartConfig: {
                options: {
                    chart: {
                      type: 'column'
                    },
                    credits: {enabled: false},
                    tooltip: {
                      headerFormat: '<span style="font-size: 10px">{point.key}</span><br/>',
                      pointFormat: '<span style="font-size: 12px">{series.name}: <b>{point.y}</b></span>'
                    },
                    plotOptions: {
                      column: {
                        stacking: 'normal'
                      },
                      series: {
                        name: 'Count',
                        cursor: 'pointer',
                        events: {
                          click: function(event) {
                            var result = dataset.results.messystreams[event.point.x];
                            if ($scope.datatypeHasHistogram(result))
                              $scope.datatypeClicked(event, result);
                          }
                        }
                      }
                    }
                },
                title: {text: ''},
                xAxis: {title: {text: ''}},
                yAxis: {title: {text: ''}},
                useHighStocks: false,
                series: [{
                  value: '',
                  key: ''
                }]
              }
        };
        widget.chartConfig.series[0].data = _.map(feature.graph, 'value');
        widget.chartConfig.xAxis.categories = _.map(feature.graph, 'key');

        updateWidgetChartSize(widget);
        dataset.widgets.push(widget);
    };


    var updateWidgetChartSize = function(widget) {
      var gridsterElement = angular.element(document.querySelector('div[gridster]'))[0]
      var widgetColWidth = gridsterElement.offsetWidth / $scope.gridsterOpts.columns;
      widget.chartConfig.size =  {
        height: widgetColWidth * widget.sizeY - widgetMargin * 2 - 40 - 18 - 2,
        width: widgetColWidth * widget.sizeX - widgetMargin * 2 - 2,
      }
    }

    var createDatatypesWidget = function(dataset) {
      var widget = {
        sizeX: 2, sizeY: 2, row: 0, col: 0, type: 'datatypes',
        title: 'Data types', vizType: 'chart', defaultVizType: 'chart',
        chartConfig: {
          // highcharts standard options
          options: {
            chart: {
              type: 'column'
            },
            credits: {enabled: false},
            tooltip: {
              headerFormat: '<span style="font-size: 10px">{point.key}</span><br/>',
              pointFormat: '<span style="font-size: 12px">{series.name}: <b>{point.y}</b></span>'
            },
            plotOptions: {
              column: {
                stacking: 'normal'
              },
              series: {
                cursor: 'pointer',
                events: {
                  click: function(event) {
                    var result = dataset.results.messystreams[event.point.x];
                    if ($scope.datatypeHasHistogram(result))
                      $scope.datatypeClicked(event, result);
                  }
                }
              }
            },
          },
          // The below properties are watched separately for changes.
          title: {text: ''},
          xAxis: {title: {text: ''}},
          yAxis: {title: {text: ''}},
          useHighStocks: false
        }
      }
      updateWidgetChartSize(widget);
      return widget;
    }

    $scope.resetDatasetWidgets = function() {
      // install root level widgets per dataset
      var dataset = $scope.selectedDataset;
      if (!dataset) return;

      if (dataset.results) {
        // console.log(dataset.results.messystreams)
        var keys = _.map(dataset.results.messystreams, 'key');
      }

      // these are initial widgets
      var missingWidgets = {
        'datatypes': createDatatypesWidget,
        'outliers': createOutliersWidget
      };
      var defaultWidgets = _.keys(missingWidgets);

      // reset action: filter out widgets that are not part of initial widgets
      dataset.widgets = _.filter(dataset.widgets || [], function(widget){
        var pass = _.includes(defaultWidgets, widget.type)
        if (pass) {
          delete missingWidgets[widget.type];
          widget.vizType = widget.defaultVizType;
        }
        return pass;
      })

      // if any of the initial widgets are missing, add them accordingly
      _.each(missingWidgets, function(constructor){
        dataset.widgets.push(constructor(dataset))
      })
    };

    var paginationOptions = {
      pageNumber: 1,
      pageSize: 10,
      sort: null
    };

    var cleanKeyName = function(key) {
      return key.replace(/[\(\)]/g, ' ');
    }

    var cleanTuples = function(tuples) {
      return _(tuples)
        .map(function(tuple){
          return _(tuple)
            .reduce(function(hash, value, key){
              return _.set(hash, cleanKeyName(key), value);
            }, {})
        })
        .value();
    }

    var getPage = function() {
      var deferred = $q.defer();

      $scope.loadingData = true;

      nadeefilerServices.Tuple.query({
        datasetId: $scope.selectedDataset.id,
        pageNumber: paginationOptions.pageNumber,
        pageSize: paginationOptions.pageSize,
        sortColumn: paginationOptions.sort ? paginationOptions.sort.col : null,
        sortDirection: paginationOptions.sort ? paginationOptions.sort.dir : null
      }, function(tuples){
        // set data
        $scope.datasetGrid.data = cleanTuples(tuples);
        // set header
        if (tuples.length > 0)
          $scope.datasetGrid.columnDefs = _(tuples[0]).keys().map(function(key){
            return {displayName: key, name: cleanKeyName(key)};
          }).value();
        $scope.gridApi.core.notifyDataChange(uiGridConstants.dataChange.ALL);
        $scope.loadingData = false;
        deferred.resolve();
      });

      return deferred.promise;
    };

    console.log("defining $scope.datasetGrid")
    $scope.datasetGrid = {
      paginationPageSizes: [10, 25, 50, 100],
      paginationPageSize: 10,
      useExternalPagination: true,
      useExternalSorting: true,
      onRegisterApi: function(gridApi) {
        $scope.gridApi = gridApi;
        // $scope.datasetGrid.columnDefs = [];
        gridApi.core.notifyDataChange(uiGridConstants.dataChange.ALL);
        console.log("registered gridApi")
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

    $scope.gridsterOpts = {
        columns: 4, // the width of the grid, in columns
        pushing: true, // whether to push other items out of the way on move or resize
        floating: true, // whether to automatically float items up so they stack (you can temporarily disable if you are adding unsorted items with ng-repeat)
        swapping: true, // whether or not to have items of the same size switch places instead of pushing down if they are the same size
        width: 'auto', // can be an integer or 'auto'. 'auto' scales gridster to be the full width of its containing element
        colWidth: 'auto', // can be an integer or 'auto'.  'auto' uses the pixel width of the element divided by 'columns'
        rowHeight: 'match', // can be an integer or 'match'.  Match uses the colWidth, giving you square widgets.
        margins: [widgetMargin, widgetMargin], // the pixel distance between each widget
        outerMargin: true, // whether margins apply to outer edges of the grid
        isMobile: true, // stacks the grid items if true
        mobileBreakPoint: 600, // if the screen is not wider that this, remove the grid layout and stack the items
        mobileModeEnabled: true, // whether or not to toggle mobile mode when screen width is less than mobileBreakPoint
        minColumns: 1, // the minimum columns the grid must have
        minRows: 2, // the minimum height of the grid, in rows
        maxRows: 100,
        defaultSizeX: 1, // the default width of a gridster item, if not specifed
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
          handle: '.my-class', // optional selector for resize handle
          restrictToClass: 'gridster-allow-drag'  // allow drag only if target element has this class
        }
    };

    // TODO embed toggle logic in each widget definition module
    $scope.toggleWidget = function(widget) {
      if (!$scope.selectedDataset) {return null;}
      var results = $scope.selectedDataset.results;

      switch(widget.type) {
        case 'data':
        case 'raw':
        case 'histogram':
        case 'outlierHistogram':
          return true;
        case 'datatypes':
          return results && results.messystreams;
        case 'outliers':
          return results && results.outliers;
        default:
          return false;
          // TODO: toggle widget based on its type/status
      }
    };

    $scope.removeWidget = function(widget, index) {
      $scope.selectedDataset.widgets.splice(index, 1);
    };

    $scope.datatypeHasHistogram = function(result) {
      return result.types.length > 1 || result.types[0].name !== 'null';
    }

    $scope.datatypeHasSemantics = function(dataset, key) {
      try {
        return dataset.results.semantic[key].length > 0
      }
      catch(e) {
        return false;
      }
    }

    var createHistogramWidget = function(dataset, key, type) {
      var widgetTitle = "'" + key + "' as " + type;
      var widget = {
        sizeX: 2, sizeY: 1, type: 'histogram',
        title: widgetTitle,
        key: key,
        datatype: type,
        vizType: 'histogram',
        sort: 'value',
        chartConfig: {
          // highcharts standard options
          options: {
            chart: {
              type: 'column',
              zoomType: 'x',
              panning: true,
              panKey: 'shift'
            },
            subtitle: {
              text: 'Click and drag to zoom in. Hold down shift key to pan.'
            },
            credits: {enabled: false},
            column: {
              pointPadding: 0,
              borderWidth: 0,
              groupPadding: 0,
              shadow: false
            },
            legend: {enabled: false},
            tooltip: {
              headerFormat: '<span style="font-size: 10px">{point.key}</span><br/>',
              pointFormat: '<span style="font-size: 12px">Count: <b>{point.y}</b></span>'
            }
          },
          // The below properties are watched separately for changes.
          title: {text: ''},
          xAxis: {title: {text: ''}},
          yAxis: {title: {text: ''}},
          useHighStocks: false
        }
      }
      updateWidgetChartSize(widget);

      dataset.widgets.push(widget);

      // query from server
      getHistogram(dataset, key, type)
      .then(function(){
        updateSeries(widget);
      })
    }

    var updateSeries = function(widget) {
      // console.log("updating histogram with new sort", widget.sort)
      if (widget.vizType === 'histogram') {
        var histogram = $scope.selectedDataset.histograms[widget.key][widget.datatype][widget.sort];
        widget.chartConfig.series = [{
          name: '', grouping: true, // TODO grouping not working?
          color: typesDictionary[widget.datatype],
          data: _.map(histogram, 'count')
        }];
        widget.chartConfig.xAxis.categories = _.map(histogram, 'value');
      }
      else if (widget.vizType === 'semantic') {
        var semantic = $scope.selectedDataset.results.semantic[widget.key];
        widget.chartConfig.series = [{
          name: 'Similar semantic types', grouping: false,
          color: typesDictionary.semantic,
          data: _.map(semantic, 'score')
        }];
        widget.chartConfig.xAxis.categories = _.map(semantic, 'object');
      }
    }


    $scope.datatypeClicked = function(event, result) {
      // show histograms
      var dataset = $scope.selectedDataset;
      if (!dataset) return;

      _.each(result.types, function(type){
        if (type.name != 'null')
          createHistogramWidget(dataset, result.key, type.name)
      })

      $rootScope.preventDefault(event);
    }

    $scope.selectedOptionClass = function(currentValue, newValue) {
      // return widget.vizType === vizType ? 'box-content-action-active' : 'box-content-action';
      return currentValue === newValue ? 'box-content-action-active' : 'box-content-action';
    }

    $scope.toggleWidgetOption = function(widget, optionKey, newValue) {
      if (widget[optionKey] === newValue) return;
      widget[optionKey] = newValue;
      if (optionKey === 'sort' || optionKey == 'vizType' && newValue != 'list')
        updateSeries(widget);
    }

    var updateDisplayedWidgetsChartSize = function() {
      if (!$scope.selectedDataset) return;
      _.each($scope.selectedDataset.widgets, function(widget){
        updateWidgetChartSize(widget);
      })
    }

    $scope.$on('gridster-resized', function(sizes, gridster) {
      updateDisplayedWidgetsChartSize();
    })

    // $scope.$on('gridster-item-initialized', function(item) {
    //   console.log(item);
    // })

    $scope.$on('gridster-item-resized', function(event, item) {
      // TODO only update the widget corresponding to changed item
      updateDisplayedWidgetsChartSize();
    })

  });
