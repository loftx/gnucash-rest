angular.module('core.vendor', []);

angular.module('core.vendor').
  factory('Vendor', function($q, $http, $timeout, Api, Bill) {
    var obj = {

      // well use this to get the http bit, then post process it normally?
      query: function() {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/vendors', {headers: Api.getHeaders()})
          .success(function(vendors) {
            deferred.resolve(vendors);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'vendors');
          })
        ;

        return deferred.promise;
      },

       get: function(vendorID) {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/vendors/' + vendorID, {headers: Api.getHeaders()})
          .success(function(vendor) {
            deferred.resolve(vendor);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'vendors');
          })
        ;

        return deferred.promise;
      },

      getBills: function(vendorID) {
        var deferred = $q.defer();

        
        $http.get(Api.getUrl() + '/vendors/' + vendorID + '/bills?is_active=1', {headers: Api.getHeaders()})
          .success(function(bills) {

            for (var i in bills) {
              bills[i] = Bill.format(bills[i]);
            }

            deferred.resolve(bills);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'vendor');
          })
        ;

        return deferred.promise;
      },

      // this is exactly like add() for customers but with a different string in the url...
      add: function(params) {
        var deferred = $q.defer();

        var headers = Api.getHeaders();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';

        $http({
          method: 'POST',
          url: Api.getUrl() + '/vendors',
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: params,
          headers: headers
        }).success(function(vendor) {

          deferred.resolve(vendor);
        
        }).error(deferred.reject);

        return deferred.promise;
      },

    }

    // could only expose certain functions
    return obj;
  }
);