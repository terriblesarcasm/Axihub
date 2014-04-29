var app = angular.module('myApp', ['ngRoute', 'ui.bootstrap', 'ngAnimate'])

.factory('Facebook', function ($http, $q) {
    return {
        getfeed: function() {
            var deferred = $q.defer();

            $http.get('/facebook/api').success(function(response) {
                deferred.resolve(response.data);
            });

            return deferred.promise;
        }
    }
})


.factory('Twitter', function ($http, $q) {
    return {
        getfeed: function() {
            var deferred = $q.defer();
            $http.get('/twitter/api').success(function(response) {
                deferred.resolve(response);
            });

            return deferred.promise;
        }
    }
})

.factory('LinkedIn', function ($http, $q) {
    return {
        getfeed: function() {
            var deferred = $q.defer();
            $http.get('/linkedin/api').success(function(response) {
                deferred.resolve(response.values);
            });

            return deferred.promise;
        }
    }
})

.factory('Smart', function (Twitter, Facebook, LinkedIn, $q) {
    var smartfeed = [];
    var promises = [];
    var providerslist = { 'facebook.com' : Facebook.getfeed, 'twitter.com' : Twitter.getfeed, 'linkedin.com' : LinkedIn.getfeed };
    
    return {

        getfeed: function(user) {
            var deferred = $q.defer();
            for (var i = user.accounts.length - 1; i >= 0; i--) {
                promises.push(providerslist[user.accounts[i].provider]());
            };

            $q.all(promises).then(function(result) {
                for(var i = result.length - 1; i >= 0; i--) {
                    for(var j = result[i].length - 1; j >= 0; j--) {
                        if(result[i][j].created_at) {
                            result[i][j].axihubprovider = 'twitter.com';
                            result[i][j].axihubtime = Date.parse(result[i][j].created_at);
                            continue;
                        } else if (result[i][j].created_time) {
                            result[i][j].axihubprovider = 'facebook.com';
                            result[i][j].axihubtime = Date.parse(result[i][j].created_time);
                            continue;
                        } else if (result[i][j].timestamp) {
                            result[i][j].axihubprovider = 'linkedin.com';
                            result[i][j].axihubtime = result[i][j].timestamp;
                            continue;
                        }
                    }
                    smartfeed = smartfeed.concat(result[i]);
                };
                deferred.resolve(smartfeed);
                console.log(smartfeed);
            });

            return deferred.promise;
        }
    }
})

.service('navsearch', function() {
    var myObj = {
        search:{
          display: 'Site',
          param: 'name',
          term: {},
          placeholder: 'Search eg. Facebook.com'
        },
        setSearch:function(newObj) {
          angular.copy(newObj,myObj.search)
          console.log(myObj.search);
        }
    }
    return myObj;
})


.run(function ($rootScope, Facebook, Twitter, Smart, LinkedIn, $http) {
    $rootScope.Facebook = Facebook;
    $rootScope.Twitter = Twitter;
    $rootScope.Smart = Smart;
    $rootScope.LinkedIn = LinkedIn;
    $http.get('/get/user').success(function(response) {
        $rootScope.user = response;
    });
})


.config(['$routeProvider', '$locationProvider', 
    function ($routeProvider, $locationProvider) {
        $routeProvider.
        when('/app', {
            templateUrl: '/partials/index',
            controller: 'MainCtrl'
        }).
        when('/app#_=_', {
            templateUrl: '/partials/index',
            controller: 'MainCtrl'
        }).
        when('/feed', {
            templateUrl: '/partials/feed',
            controller: 'MainCtrl'
        }).
        when('/account', {
            templateUrl: '/partials/account',
            controller: 'MainCtrl'
        }).
        otherwise({
            redirectTo: '/app'
        });
    $locationProvider.html5Mode(true);
}])


.filter('dateFilter', function () {
    var hour = 60;
    var day = hour * 24;
    var week = day * 7;
    var month = day * 30;
    var year = day * 365;

    return function (objects) {
        var post_time = new Date(objects);

        var diff = new Date().getTime() - post_time;
        var diff_in_mins = diff / 60000;
        
        if (diff_in_mins < hour) { // if post is less than an hour old
            if (diff_in_mins < 1) {
                return Math.floor(diff_in_mins) + ' minute ago';
            } else {
                return Math.floor(diff_in_mins) + ' minutes ago';
            }
        } else if (diff_in_mins < (day)) {
            if (diff_in_mins < (2 * 60)) {
                return Math.floor(diff_in_mins / 60) + ' hour ago';
            } else {
                return Math.floor(diff_in_mins / 60) + ' hours ago';
            }
        } else if (diff_in_mins < (year)) {
            if (diff_in_mins < (2 * day)) {
                return 'yesterday';
            } else {
                return Math.floor(diff_in_mins / (24 * 60)) + ' days ago';
            }
        } else {
            return post_time;
        }
    }
})


.filter('accountFilter', function() {
  return function(objects) {
    //Edit this array when there are new networks to show them in the accounts page
    var networks = ['facebook.com', 'twitter.com', 'linkedin.com'];
    var accountNetworks = objects.map(function (value) { return value.provider; })
    var leftoverNetworks = networks.filter(function (value) {return accountNetworks.indexOf(value) < 0;});
    
    return leftoverNetworks;
  }
})

.controller('MainCtrl', function ($scope, $window, Twitter, Smart, Facebook, LinkedIn, $location, $q, $rootScope, navsearch) {

    $scope.user = $rootScope.user;

    $scope.init = {
        ordervar: 'axihubtime'
    }
    
    $scope.getSmartFeed = function() {
        Smart.getfeed($scope.user).then(function(feed) {
            $scope.Smart.feed = feed;
        });
    }

    $scope.stripdotCom = function(network) {
        var domain = network.split(".");
        return 'auth/' + domain[0];
    }

    $scope.search = navsearch.search;

     var init = function() {
        Smart.getfeed($scope.user).then(function(feed) {
            $scope.Smart.feed = feed;
        });
    }

    init();

})

.controller('HeaderController', function ($scope, $location, navsearch) 
{ 
    $scope.isActive = function (viewLocation) { 
        return viewLocation === $location.path();
    };

    $scope.search = {
        display: 'Site',
        param: 'axihubprovider',
        term: {},
        placeholder: 'Search eg. Facebook.com'
    }

    $scope.isCollapsed = true;
    $scope.setSearch = navsearch.setSearch;

    $scope.dropdown = [
        { 
            display: 'Site', 
            param: 'axihubprovider',
            placeholder: 'Search eg. Facebook.com'
        },
        {
            display: 'Entire Feed',
            param: '$',
            placeholder: 'Search everything'
        }
    ]
});

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

