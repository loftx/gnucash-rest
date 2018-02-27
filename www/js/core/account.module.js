angular.module('core.account', []);

angular.module('core.account').
factory('Account', function($q, $http, $timeout, Api, Money) {
    var obj = {

      // well use this to get the http bit, then post process it normally?
      query: function() {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/accounts', {headers: Api.getHeaders()})
          .success(function(data) {

            var accounts = obj.getSubAccounts(data, 0);

            for (var i in accounts) {
              accounts[i] = obj.formatAccount(accounts[i]);
            }

            deferred.resolve(accounts);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'accounts');
          })
        ;

        return deferred.promise;
      },

      get: function(accountGuid) {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/accounts/' + accountGuid, {headers: Api.getHeaders()})
          .success(function(data) {
            deferred.resolve(data);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'accounts');
          })
        ;

        return deferred.promise;
      },

      getSplits: function(account, params) {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/accounts/' + account.guid + '/splits' + obj.generateQueryString(params), {headers: Api.getHeaders()})
          .success(function(splits) {

            for (var i in splits) {
              splits[i] = obj.formatSplit(splits[i], account);
            }

            deferred.resolve(splits);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'accounts');
          })
        ;

        return deferred.promise;
      },

      // could this be combined with getAccounts - it really just runs getAccounts and runs some processing on it - can we chain though defers?
      getAccountsForDropdown: function() {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/accounts', {headers: Api.getHeaders()})
          .success(function(data) {

            var accounts = obj.getSubAccounts(data, 0);
            var nonPlaceholderAccounts = [];

            // limit accounts to income accounts and remove placeholder accounts 
            for (var i in accounts) {
              if (!accounts[i].placeholder) {
                nonPlaceholderAccounts.push(accounts[i]);
              }
            }

            deferred.resolve(nonPlaceholderAccounts);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'accounts');
          })
        ;

        return deferred.promise;
      },

      // this is very similar to getAccountsForDropdown
      getInvoiceAccountsForDropdown: function() {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/accounts', {headers: Api.getHeaders()})
          .success(function(data) {

            var accounts = obj.getSubAccounts(data, 0);
            var invoiceAccounts = [];

            // limit accounts to income accounts and remove placeholder accounts 
            for (var i in accounts) {
              if (accounts[i].type_id == 8 && !accounts[i].placeholder) {
                invoiceAccounts.push(accounts[i]);
              }
            }

            deferred.resolve(invoiceAccounts);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'accounts');
          })
        ;

        return deferred.promise;
      },

       // this is very similar to getAccountsForDropdown - could take a placeholder e.g. https://github.com/Gnucash/gnucash/blob/310442ffe68d583b633d380c9b0e5d5524bf1a47/libgnucash/engine/Account.h
      getBillAccountsForDropdown: function() {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/accounts', {headers: Api.getHeaders()})
          .success(function(data) {

            var accounts = obj.getSubAccounts(data, 0);
            var invoiceAccounts = [];

            // limit accounts to income accounts and remove placeholder accounts 
            for (var i in accounts) {
              if (accounts[i].type_id == 9 && !accounts[i].placeholder) {
                invoiceAccounts.push(accounts[i]);
              }
            }

            deferred.resolve(invoiceAccounts);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'accounts');
          })
        ;

        return deferred.promise;
      },

      // this is very similar to getAccountsForDropdown
      getAccountsOfTypesForDropdown: function(type_ids) {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/accounts', {headers: Api.getHeaders()})
          .success(function(data) {

            var accounts = obj.getSubAccounts(data, 0);
            var invoiceAccounts = [];

            // limit accounts to income accounts and remove placeholder accounts 
            for (var i in accounts) {
              if (type_ids.indexOf(accounts[i].type_id) != -1 && !accounts[i].placeholder) {
                invoiceAccounts.push(accounts[i]);
              }
            }

            deferred.resolve(invoiceAccounts);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'accounts');
          })
        ;

        return deferred.promise;
      },

      // TODO: Sperate this out into Api
      generateQueryString: function(params) {

        var queryParams = '';

        if(/[0-9]{4}-[0-9]{2}-[0-9]{2}/i.test(params.date_posted_from)) {
          if (queryParams != '') {
            queryParams = queryParams + '&';
          }
          queryParams = queryParams + 'date_posted_from=' + params.date_posted_from;
        }

        if(/[0-9]{4}-[0-9]{2}-[0-9]{2}/i.test(params.date_posted_to)) {
          if (queryParams != '') {
            queryParams = queryParams + '&';
          }
          queryParams = queryParams + 'date_posted_to=' + params.date_posted_to;
        }

        if (queryParams != '') {
          queryParams = '?' +  queryParams;
        }

        return queryParams;

      },

      formatSplit: function(split, account) {
        if (account.type_id == 0) {
          if (split.amount > 0) {
            split.income = Money.format_currency(account.type_id, account.currency, split.amount);
            split.charge = '';
          } else {
            split.income = '';
            split.charge = Money.format_currency(account.type_id, account.currency, -split.amount);
          }
        } else if (account.type_id != 8) {
          split.charge = Money.format_currency(8, account.currency, split.amount);
          split.income = '';
        } else {
          split.income = Money.format_currency(8, account.currency, -split.amount);
          split.charge = '';
        }

        if (account.type_id == 8) {
          split.balance = -(split.balance);
          split.amount = -(split.amount);
        }

        split.formatted_balance = Money.format_currency(account.type_id, account.currency, split.balance);
        split.formatted_balance_gbp = Money.format_currency(account.type_id, account.currency, split.balance_gbp);
        split.formatted_amount = Money.format_currency(account.type_id, account.currency, split.amount);

        return split;
      },

      // this could be not exposed
      formatAccount: function(account) {

        if (account.type_id == 8) {
          account.balance = -(account.balance);
          account.balance_gbp = -(account.balance_gbp);
        }

        account.formatted_balance = Money.format_currency(account.type_id, account.currency, account.balance);
        account.formatted_balance_gbp = Money.format_currency(account.type_id, account.currency, account.balance_gbp);

        return account;
      },
      
      getSubAccounts: function(data, level) {

        var flatAccounts = [];

        for (var i in data.subaccounts) {
          data.subaccounts[i].level = level
          flatAccounts.push(data.subaccounts[i]);
          var subAccounts = obj.getSubAccounts(data.subaccounts[i], level + 1);
          for (var subAccount in subAccounts) {
            subAccounts[subAccount].name = data.subaccounts[i].name + ':' + subAccounts[subAccount].name;
            flatAccounts.push(subAccounts[subAccount]);
          }
        }

        return flatAccounts;
      },

    }

    // could only expose certain functions
    return obj;
  }
);