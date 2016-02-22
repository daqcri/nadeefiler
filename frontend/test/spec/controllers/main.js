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

  it('should attach a list of todos to the scope', function () {
    expect(scope.todos.length).toBe(3);
  });

  it('should attach add/remove todo handlers the scope', function () {
    expect(typeof scope.addTodo).toBe('function');
    expect(typeof scope.removeTodo).toBe('function');
  });

});
