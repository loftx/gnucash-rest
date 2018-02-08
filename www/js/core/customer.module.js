angular.module('core.customer', []);

angular.module('core.customer').
  factory('Customer', function($q, $http, $timeout, Api, Invoice) {
    var obj = {

      // well use this to get the http bit, then post process it normally?
      query: function() {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/customers', {headers: Api.getHeaders()})
          .success(function(customers) {
            deferred.resolve(customers);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'customers');
          })
        ;

        return deferred.promise;
      },

      get: function(customerID) {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/customers/' + customerID, {headers: Api.getHeaders()})
          .success(function(customer) {

            //customer = obj.formatcustomer(customer);

            deferred.resolve(customer);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'customers');
          })
        ;

        return deferred.promise;
      },

      getInvoices: function(customerID) {
        var deferred = $q.defer();

        
        $http.get(Api.getUrl() + '/customers/' + customerID + '/invoices?is_active=1', {headers: Api.getHeaders()})
          .success(function(invoices) {

            for (var i in invoices) {
              invoices[i] = Invoice.format(invoices[i]);
            }

            deferred.resolve(invoices);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'customer');
          })
        ;

        return deferred.promise;
      },

    }

    // could only expose certain functions
    return obj;
  }
);