angular.module('core.bill', []);

angular.module('core.bill').
  factory('Bill', function($q, $http, $timeout, Api, Dates, Money, Entry) {
    var obj = {

      // well use this to get the http bit, then post process it normally?
      query: function(params) {
        var deferred = $q.defer();

        
        $http.get(Api.getUrl() + '/bills' + obj.generateQueryString(params), {headers: Api.getHeaders()})
          .success(function(bills) {

            for (var i in bills) {
              bills[i] = obj.format(bills[i]);
            }

            deferred.resolve(bills);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'bills');
          })
        ;

        return deferred.promise;
      },

      get: function(billID) {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/bills/' + billID, {headers: Api.getHeaders()})
          .success(function(bill) {

            bill = obj.format(bill);

            deferred.resolve(bill);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'bills');
          })
        ;

        return deferred.promise;
      },

      // idential to invoice?
      add: function(params) {
        var deferred = $q.defer();

        var headers = Api.getHeaders();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';

        $http({
          method: 'POST',
          url: Api.getUrl() + '/bills',
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: params,
          headers: headers
        }).success(function(bill) {

          bill = obj.format(bill);

          deferred.resolve(bill);
        
        }).error(deferred.reject);

        return deferred.promise;
      },

      // identical to invoice
      update: function(billID, params) {
        var deferred = $q.defer();

        var headers = Api.getHeaders();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';

        $http({
          method: 'POST',
          url: Api.getUrl() + '/bills/' + billID,
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: params,
          headers: headers
        }).success(function(bill) {

          bill = obj.format(bill);

          deferred.resolve(bill);
        
        }).error(deferred.reject);

        return deferred.promise;
      },

      // this is idential to update apart from the verb and identical to invoice
      pay: function(billID, params) {
        var deferred = $q.defer();

        var headers = Api.getHeaders();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';

        $http({
          method: 'PAY',
          url: Api.getUrl() + '/bills/' + billID,
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: params,
          headers: headers
        }).success(function(bill) {

          bill = obj.format(bill);

          deferred.resolve(bill);
        
        }).error(deferred.reject);

        return deferred.promise;
      },

      recalculate: function(bill) {

        bill.total = 0;

        for (var i in bill.entries) {
          bill.total = bill.total + bill.entries[i].total_inc_discount;
        }

        bill = obj.format(bill);

        return bill;
      },

      format: function(bill) {
        bill.formatted_date_opened = Dates.dateFormat(bill.date_opened);
        bill.formatted_date_due = Dates.dateFormat(bill.date_due);
        bill.formatted_date_posted = Dates.dateFormat(bill.date_posted);

        for (var i in bill.entries) {
          bill.entries[i] = Entry.format(bill.entries[i]);
        }

        bill.formatted_total = Money.format_currency(8, bill.currency, bill.total);

        return bill;
      },

      // should seperate param validation and querystring building
      // TODO: This is identical to invoices
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

    }

    // could only expose certain functions
    return obj;
  }
);