var app = angular.module('fbAuth');

app.controller('DashboardCtrl', function($scope, authService){
  console.log("In DashBoard Ctrl");
  console.log(authService.cachedUser.password.email)
  console.log(authService.cachedUser)

  var vm = this;
  vm.email = authService.cachedUser.password.email;

  
  	
});