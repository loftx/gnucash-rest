angular.module('core.invoice', []);

angular.module('core.invoice').
  factory('Invoice', function($q, $http, $timeout, api) {
    var obj = {

      // well use this to get the http bit, then post process it normally?
      query: function(params) {
        var deferred = $q.defer();

        
        $http.get(api.getUrl() + '/invoices' + obj.generateQueryString(params), {headers: api.getHeaders()})
          .success(function(invoices) {

            for (var i in invoices) {
              invoices[i] = obj.formatInvoice(invoices[i]);
            }

            deferred.resolve(invoices);
          })
          .error(function(data, status) {
            api.handleErrors(data, status, 'invoices');
          })
        ;

        return deferred.promise;
      },

      get: function(invoiceID) {
        var deferred = $q.defer();

        $http.get(api.getUrl() + '/invoices/' + invoiceID, {headers: api.getHeaders()})
          .success(function(invoice) {

            invoice = obj.formatInvoice(invoice);

            deferred.resolve(invoice);
          })
          .error(function(data, status) {
            api.handleErrors(data, status, 'invoices');
          })
        ;

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

      // this could be not exposed
      formatInvoice: function(invoice) {

        invoice.date_opened = dateFormat(invoice.date_opened);
        invoice.date_due = dateFormat(invoice.date_due);

        for (var i in invoice.entries) {
          invoice.entries[i] = obj.formatEntry(invoice.entries[i], invoice.currency);
        }

        invoice.total = format_currency(8, invoice.currency, -invoice.total);

        return invoice;
      },

      // move this to entries
      formatEntry: function(entry, currency) {
        entry.date = dateFormat(entry.date);
        entry.total_ex_discount = entry.quantity * entry.inv_price;

        // doesn't take into account tax

        entry.total_inc_discount = entry.total_ex_discount;

        if (entry.discount_type == 1) {
          entry.total_inc_discount = entry.total_ex_discount - entry.discount;
          entry.discount = format_currency(8, currency, -entry.discount);
        } else {
          // TODO: percentage discounts
        }

        // was using format_money instead of format_currency but it's not avaliable here - fix
        // also 8s are haescoded
        // it would be good to get format_currency in it's own module or in core...

        entry.discount_type = format_discount_type(entry.discount_type, currency);
        entry.total_inc_discount = format_currency(8, currency, -entry.total_inc_discount);
        entry.inv_price = format_currency(8, currency, -entry.inv_price);

        return entry;
      }

    }

    // could only expose certain functions
    return obj;
  }
);