angular.module('core.vendor', []);

angular.module('core.vendor').
  factory('Vendor', function($q, $http, $timeout, Api, Money) {
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
          .success(function(customer) {
            deferred.resolve(customer);
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
              //bills[i] = Invoice.format(bills[i]);
            }

            deferred.resolve(bills);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'vendor');
          })
        ;

        return deferred.promise;
      },

    }

    // could only expose certain functions
    return obj;
  }
);