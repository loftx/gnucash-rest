angular.module('core.bill', []);

angular.module('core.bill').
  factory('Bill', function($q, $http, $timeout, Api, Money) {
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

      /*add: function(params) {
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

          invoice = obj.formatInvoice(invoice);

          deferred.resolve(invoice);
        
        }).error(deferred.reject);

        return deferred.promise;
      }, */

      format: function(bill) {

        // $scope.bill.notes = nl2br($scope.bill.notes);

        bill.date_opened = dateFormat(bill.date_opened);
        bill.date_due = dateFormat(bill.date_due);

        for (var i in bill.entries) {
          bill.entries[i] = obj.formatEntry(bill.entries[i], bill.currency);
        }

        bill.total = Money.format_currency(8, bill.currency, -bill.total);

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

      // this could be not exposed
      format: function(bill) {

        bill.date_opened = dateFormat(bill.date_opened);
        bill.date_due = dateFormat(bill.date_due);

        for (var i in bill.entries) {
          bill.entries[i] = obj.formatEntry(bill.entries[i], bill.currency);
        }

        bill.total = Money.format_currency(8, bill.currency, -bill.total);

        return bill;
      },

      // move this to entries (it is slighly different to invoices as uses bill_price instead of inv_price)
      formatEntry: function(entry, currency) {
        entry.date = dateFormat(entry.date);
        entry.total_ex_discount = entry.quantity * entry.bill_price;

        // doesn't take into account tax

        entry.total_inc_discount = entry.total_ex_discount;

        if (entry.discount_type == 1) {
          entry.total_inc_discount = entry.total_ex_discount - entry.discount;
          entry.discount = Money.format_currency(8, currency, -entry.discount);
        } else {
          // TODO: percentage discounts
        }

        // also 8s are hardcoded
        // it would be good to get format_currency in it's own module or in core...

        entry.discount_type = Money.format_discount_type(entry.discount_type, currency);
        entry.total_inc_discount = Money.format_currency(8, currency, -entry.total_inc_discount);
        entry.bill_price = Money.format_currency(8, currency, -entry.bill_price);

        return entry;
      }

    }

    // could only expose certain functions
    return obj;
  }
);