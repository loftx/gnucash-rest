angular.module('core.entry', []);

angular.module('core.entry').
  factory('Entry', function($q, $http, $timeout, Api, Dates, Money) {
    var obj = {

      get: function(entryGuid) {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/entries/' + entryGuid, {headers: Api.getHeaders()})
          .success(function(entry) {

            entry = obj.format(entry);

            deferred.resolve(entry);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'entry');
          })
        ;

        return deferred.promise;
      },

      add: function(type, id, params) {
        var deferred = $q.defer();

        var headers = Api.getHeaders();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';

        $http({
          method: 'POST',
          url: Api.getUrl() + '/' + type + 's/' + id + '/entries',
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: params,
          headers: headers
        }).success(function(entry) {

          entry = obj.format(entry);

          deferred.resolve(entry);
        }).error(deferred.reject);

        return deferred.promise;
      },

      update: function(entryGuid, params) {
        var deferred = $q.defer();

        var headers = Api.getHeaders();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';

        $http({
          method: 'POST',
          url: Api.getUrl() + '/entries/' + entryGuid,
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: params,
          headers: headers
        }).success(function(entry) {

          entry = obj.format(entry);

          deferred.resolve(entry);
        }).error(deferred.reject);

        return deferred.promise;
      },

      delete: function(entryGuid) {
        var deferred = $q.defer();

        $http({
          method: 'DELETE',
          url: Api.getUrl() + '/entries/' + entryGuid,
          headers: Api.getHeaders()
        }).success(function() {
          deferred.resolve();
        }).error(deferred.reject);

        return deferred.promise;
      },

      // from invoices module (is there a seperate one for bills?)
      format: function(entry) {
        entry.formatted_date = Dates.dateFormat(entry.date);

        if (entry.inv_account.hasOwnProperty('guid')) {
          entry.total_ex_discount = entry.quantity * entry.inv_price;
        } else if (entry.bill_account.hasOwnProperty('guid')) {
          entry.total_ex_discount = entry.quantity * entry.bill_price;
        }

        // doesn't take into account tax

        entry.total_inc_discount = entry.total_ex_discount;

        if (entry.discount_type == 1) {
          entry.total_inc_discount = entry.total_ex_discount - entry.discount;

          if (entry.inv_account.hasOwnProperty('guid')) {
            entry.formatted_discount = Money.format_currency(8, entry.inv_account.currency, -entry.discount);
          } else if (entry.bill_account.hasOwnProperty('guid')) {
            entry.formatted_discount = Money.format_currency(8, entry.bill_account.currency, -entry.discount);
          } 
        } else {
          // TODO: percentage discounts
        }

        // also 8s are hardcoded
        // it would be good to get format_currency in it's own module or in core...

        if (entry.inv_account.hasOwnProperty('guid')) { 
          entry.formatted_discount_type = Money.format_discount_type(entry.discount_type, entry.inv_account.currency);
          entry.formatted_inv_price = Money.format_currency(8, entry.inv_account.currency, -entry.inv_price);
          entry.formatted_total_inc_discount = Money.format_currency(8, entry.inv_account.currency, -entry.total_inc_discount);
        } else if (entry.bill_account.hasOwnProperty('guid')) {
          entry.formatted_discount_type = Money.format_discount_type(entry.discount_type, entry.bill_account.currency);
          entry.formatted_bill_price = Money.format_currency(8, entry.bill_account.currency, -entry.bill_price);
          entry.formatted_total_inc_discount = Money.format_currency(8, entry.bill_account.currency, -entry.total_inc_discount);
        } 
        
        return entry;
      },

    }

    // could only expose certain functions
    return obj;
  }
);