'use strict';

/**
 * @ngdoc overview
 * @name frontendApp
 * @description
 * # frontendApp
 *
 * Main module of the application.
 */
angular
  .module('frontendApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'config',
    'ui.bootstrap',
    'gridster',
    'ngFileUpload',
    'ui.grid',
    'ui.grid.pagination',
    'ngLodash',
    'highcharts-ng',
    'header.controller',
    'main.controller'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        controllerAs: 'main'
      })
      .when('/github', {
        templateUrl: 'views/github.html'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
