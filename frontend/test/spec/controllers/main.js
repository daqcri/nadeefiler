'use strict';

describe('Controller: MainCtrl', function () {

  // load the controller's module
  beforeEach(module('frontendApp'));

  var MainCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    MainCtrl = $controller('MainCtrl', {
      $scope: scope
      // place here mocked dependencies
    });
  }));

  it('should attach a list of projects to the scope', function () {
    // TODO mock api
  });

  it('should attach add/remove project handlers the scope', function () {
    expect(typeof scope.addProject).toBe('function');
    expect(typeof scope.removeProject).toBe('function');
  });

});
