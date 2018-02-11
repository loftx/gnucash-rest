angular.module('core.transaction', []);

angular.module('core.transaction').
  factory('Transaction', function($q, $http, $timeout, Api, Money) {
    var obj = {

      get: function(tranasactionGuid) {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/transactions/' + tranasactionGuid, {headers: Api.getHeaders()})
          .success(function(transaction) {
            deferred.resolve(transaction);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'transaction');
          })
        ;

        return deferred.promise;
      },

      add: function(params) {
        var deferred = $q.defer();

        var headers = Api.getHeaders();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';

        $http({
          method: 'POST',
          url: Api.getUrl() + '/transactions',
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: params,
          headers: headers
        }).success(function(transaction) {
          deferred.resolve(transaction);
        }).error(deferred.reject);

        return deferred.promise;
      },

      update: function(transactionGuid, params) {
        var deferred = $q.defer();

        var headers = Api.getHeaders();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';

        $http({
          method: 'POST',
          url: Api.getUrl() + '/transactions/' + transactionGuid,
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: params,
          headers: headers
        }).success(function(transaction) {
          deferred.resolve(transaction);
        }).error(deferred.reject);

        return deferred.promise;
      },

      delete: function(transactionGuid) {
        var deferred = $q.defer();

        $http({
          method: 'DELETE',
          url: Api.getUrl() + '/transactions/' + transactionGuid,
          headers: Api.getHeaders()
        }).success(function() {
          deferred.resolve();
        }).error(deferred.reject);

        return deferred.promise;
      },

    }

    // could only expose certain functions
    return obj;
  }
);