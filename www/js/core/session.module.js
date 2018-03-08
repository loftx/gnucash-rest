angular.module('core.session', []);

angular.module('core.session').
factory('Session', function($q, $http, $timeout, Api) {
    var obj = {

      // well use this to get the http bit, then post process it normally?
      start: function(params) {
        var deferred = $q.defer();

        var headers = Api.getHeaders();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';

        $http({
          method: 'POST',
          url: Api.getUrl() + '/session',
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: params,
          headers: headers
        }).success(deferred.resolve)
        .error(deferred.reject);

        return deferred.promise;
      },

    }

    // could only expose certain functions
    return obj;
  }
);