var ACCT_TYPE_INVALID = -1; 
var ACCT_TYPE_NONE = -1;
var ACCT_TYPE_BANK = 0; 
var ACCT_TYPE_CASH = 1; 
var ACCT_TYPE_CREDIT = 3; 
var ACCT_TYPE_ASSET = 2;  
var ACCT_TYPE_LIABILITY = 4;  
var ACCT_TYPE_STOCK = 5;  
var ACCT_TYPE_MUTUAL = 6; 
var ACCT_TYPE_CURRENCY = 7;
var ACCT_TYPE_INCOME = 8; 
var ACCT_TYPE_EXPENSE = 9;
var ACCT_TYPE_EQUITY = 10;
var ACCT_TYPE_RECEIVABLE = 11;
var ACCT_TYPE_PAYABLE = 12;  
var ACCT_TYPE_ROOT = 13; 
var ACCT_TYPE_TRADING = 14; 

angular.module('core.account', []);

angular.module('core.account').
factory('Account', function($q, $http, $timeout, Api, Money) {
    var obj = {

      types: function() {
        return [
          {
            key: ACCT_TYPE_BANK,
            value: 'Bank',
            decrease_desc: 'Deposit',
            increase_desc: 'Withdrawl'
          },
          {
            key: ACCT_TYPE_CASH,
            value: 'Cash',
            decrease_desc: 'Receive',
            increase_desc: 'Spend'
          },
          {
            key: ACCT_TYPE_ASSET,
            value: 'Asset',
            decrease_desc: 'Decrease',
            increase_desc: 'Increase'
          },
          {
            key: ACCT_TYPE_CREDIT,
            value: 'Credit Card',
            decrease_desc: 'Payment',
            increase_desc: 'Charge'
          },
          {
            key: ACCT_TYPE_LIABILITY,
            value: 'Liability',
            decrease_desc: 'Decrease',
            increase_desc: 'Increase'
          },
          {
            key: ACCT_TYPE_STOCK,
            value: 'Stock',
            decrease_desc: 'Decrease',
            increase_desc: 'Increase'
          },
          {
            key: ACCT_TYPE_MUTUAL,
            value: 'Mutual Fund',
            decrease_desc: 'Decrease',
            increase_desc: 'Increase'
          },
          {
            key: ACCT_TYPE_INCOME,
            value: 'Income',
            decrease_desc: 'Charge',
            increase_desc: 'Income'
          },
          {
            key: ACCT_TYPE_EXPENSE,
            value: 'Expense',
            decrease_desc: 'Expense',
            increase_desc: 'Rebate'
          },
          {
            key: ACCT_TYPE_EQUITY,
            value: 'Equity',
            decrease_desc: 'Decrease',
            increase_desc: 'Increase'
          },
          {
            key: ACCT_TYPE_RECEIVABLE,
            value: 'Accounts Receivable',
            decrease_desc: 'Invoice',
            increase_desc: 'Payment'
          },
          {
            key: ACCT_TYPE_PAYABLE,
            value: 'Accounts Payable',
            decrease_desc: 'Payment',
            increase_desc: 'Bill'
          },
          {
            key: ACCT_TYPE_TRADING,
            value: 'Trading',
            decrease_desc: 'Decrease',
            increase_desc: 'Increase'
          },
        ];
      },

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
      getAccountsForDropdown: function(params) {
        var deferred = $q.defer();

        if (params === undefined)  {
          params = {};
        }

        if (!('includeRoot' in params)) {
          params['includeRoot'] = false;
        }

        $http.get(Api.getUrl() + '/accounts', {headers: Api.getHeaders()})
          .success(function(data) {

            var accounts = obj.getSubAccounts(data, 0);
            var nonPlaceholderAccounts = [];

            if (data.type_id == ACCT_TYPE_ROOT && params['includeRoot'] == true) {
              delete data['subaccounts'];
              nonPlaceholderAccounts.push(data);
            }

            // limit remove placeholder accounts 
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
            var returnAccounts = [];

            // limit accounts to income accounts and remove placeholder accounts 
            for (var i in accounts) {
              if (type_ids.indexOf(accounts[i].type_id) != -1 && !accounts[i].placeholder) {
                returnAccounts.push(accounts[i]);
              }
            }

            deferred.resolve(returnAccounts);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'accounts');
          })
        ;

        return deferred.promise;
      },

      // this is very similar to getAccountsForDropdown
      getAccountsOfTypesAndPlaceholdersForDropdown: function(type_ids) {
        var deferred = $q.defer();

        $http.get(Api.getUrl() + '/accounts', {headers: Api.getHeaders()})
          .success(function(data) {


            var accounts = obj.getSubAccounts(data, 0);
            var returnAccounts = [];

            // limit accounts to income accounts and remove placeholder accounts 
            for (var i in accounts) {
              if (type_ids.indexOf(accounts[i].type_id) != -1) {
                returnAccounts.push(accounts[i]);
              }
            }

            deferred.resolve(returnAccounts);
          })
          .error(function(data, status) {
            Api.handleErrors(data, status, 'accounts');
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
          url: Api.getUrl() + '/accounts',
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: params,
          headers: headers
        }).success(function(account) {

          deferred.resolve(account);
        
        }).error(deferred.reject);

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

        // remaining untested
        // also need to do balances on front

        // ACCT_TYPE_RECEIVABLE = 11;
        // ACCT_TYPE_PAYABLE = 12;  
        
        // TODO: Handle the following account types: ACCT_TYPE_CURRENCY, ACCT_TYPE_MUTUAL,  ACCT_TYPE_STOCK, ACCT_TYPE_TRADING, ACCT_TYPE_ASSET, ACCT_TYPE_LIABILITY

        //console.log(account.type_id);

        if (
          account.type_id == ACCT_TYPE_CASH ||
          account.type_id == ACCT_TYPE_BANK ||
          account.type_id == ACCT_TYPE_CREDIT ||
          account.type_id == ACCT_TYPE_EXPENSE ||
          account.type_id == ACCT_TYPE_INCOME ||
          account.type_id == ACCT_TYPE_RECEIVABLE ||
          account.type_id ==  ACCT_TYPE_PAYABLE ||
          account.type_id == ACCT_TYPE_EQUITY
        ) {
          if (split.amount > 0) {
            split.increase = '';
            split.decrease = Money.format_currency(account.type_id, account.currency, split.amount);
          } else {
            split.increase = Money.format_currency(account.type_id, account.currency, -split.amount);
            split.decrease = '';
          }
        } else {
          console.log('formatSplit not implemented for account type ' + account.type_id);
        }

        if (
          account.type_id == ACCT_TYPE_CREDIT ||
          account.type_id == ACCT_TYPE_INCOME ||
          account.type_id == ACCT_TYPE_PAYABLE ||
          account.type_id == ACCT_TYPE_EQUITY
        ) {
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