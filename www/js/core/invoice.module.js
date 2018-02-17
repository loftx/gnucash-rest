angular.module('core.invoice', []);

angular.module('core.invoice').
  factory('Invoice', function($q, $http, $timeout, Api, Dates, Money, Entry) {
    var obj = {

      // well use this to get the http bit, then post process it normally?
      query: function(params) {
        var deferred = $q.defer();

        
        $http.get(Api.getUrl() + '/invoices' + obj.generateQueryString(params), {headers: Api.getHeaders()})
          .success(function(invoices) {

            for (var i in invoices) {
              invoices[i] = obj.format(invoices[i]);
            }

            deferred.resolve(invoices);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'invoices');
          })
        ;

        return deferred.promise;
      },

      get: function(invoiceID) {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/invoices/' + invoiceID, {headers: Api.getHeaders()})
          .success(function(invoice) {

            invoice = obj.format(invoice);

            deferred.resolve(invoice);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'invoices');
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
          url: Api.getUrl() + '/invoices',
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: params,
          headers: headers
        }).success(function(invoice) {

          invoice = obj.format(invoice);

          deferred.resolve(invoice);
        
        }).error(deferred.reject);

        return deferred.promise;
      },

      update: function(invoiceID, params) {
        var deferred = $q.defer();

        var headers = Api.getHeaders();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';

        $http({
          method: 'POST',
          url: Api.getUrl() + '/invoices/' + invoiceID,
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: params,
          headers: headers
        }).success(function(invoice) {

          invoice = obj.format(invoice);

          deferred.resolve(invoice);
        
        }).error(deferred.reject);

        return deferred.promise;
      },

      // this is idential to update apart from the verb
      pay: function(invoiceID, params) {
        var deferred = $q.defer();

        var headers = Api.getHeaders();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';

        $http({
          method: 'PAY',
          url: Api.getUrl() + '/invoices/' + invoiceID,
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: params,
          headers: headers
        }).success(function(invoice) {

          invoice = obj.format(invoice);

          deferred.resolve(invoice);
        
        }).error(deferred.reject);

        return deferred.promise;
      },

      // should seperate param validation and querystring building
      generateQueryString: function(params) {

        var queryParams = '';

        if(/[0-9]{4}-[0-9]{2}-[0-9]{2}/i.test(params.date_from)) {
          if (queryParams != '') {
            queryParams = queryParams + '&';
          }
          queryParams = queryParams + 'date_' + params.date_type + '_from=' + params.date_from;
        }

        if(/[0-9]{4}-[0-9]{2}-[0-9]{2}/i.test(params.date_to)) {
          if (queryParams != '') {
            queryParams = queryParams + '&';
          }
          queryParams = queryParams + 'date_' + params.date_type + '_to=' + params.date_to;
        }

        if (params.is_paid != '') {
          if (queryParams != '') {
            queryParams = queryParams + '&';
          }
          queryParams = queryParams + 'is_paid=' + params.is_paid;
        }

        if (params.is_active != '') {
          if (queryParams != '') {
            queryParams = queryParams + '&';
          }
          queryParams = queryParams + 'is_active=' + params.is_active;
        }

        if (queryParams != '') {
          queryParams = '?' +  queryParams;
        }

        return queryParams;

      },

      recalculate: function(invoice) {

        invoice.total = 0;

        for (var i in invoice.entries) {
          invoice.total = invoice.total + invoice.entries[i].total_inc_discount;
        }

        invoice = obj.format(invoice);

        return invoice;
      },

      // this could be not exposed
      format: function(invoice) {

        invoice.formatted_date_opened = Dates.dateFormat(invoice.date_opened);
        invoice.formatted_date_due = Dates.dateFormat(invoice.date_due);
        invoice.formatted_date_posted = Dates.dateFormat(invoice.date_posted);

        for (var i in invoice.entries) {
          invoice.entries[i] = Entry.format(invoice.entries[i]);
        }

        invoice.formatted_total = Money.format_currency(8, invoice.currency, -invoice.total);

        return invoice;
      },

    }

    // could only expose certain functions
    return obj;
  }
);