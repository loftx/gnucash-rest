angular.module('core.customer', []);

angular.module('core.customer').
  factory('Customer', function($q, $http, $timeout, api) {
    var obj = {

      // well use this to get the http bit, then post process it normally?
      query: function() {
        var deferred = $q.defer();

        $http.get(api.getUrl() + '/customers', {headers: api.getHeaders()})
          .success(function(customers) {
            deferred.resolve(customers);
          })
          .error(function(data, status) {
            api.handleErrors(data, status, 'customers');
          })
        ;

        return deferred.promise;
      },

    }

    // could only expose certain functions
    return obj;
  }
);