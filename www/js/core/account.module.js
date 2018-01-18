//angular.module('core.account', ['ngResource']);
//
// angular.
//   module('core.account').
//   factory('Account', ['$resource',
//     // need more control over this...
//     function($resource) {
//       return $resource('phones/:phoneId.json', {}, {
//         query: {
//           method: 'GET',
//           params: {phoneId: 'phones'},
//           isArray: true
//         }
//       });
//     }
//   ]);

angular.module('core.account', []);

angular.module('core.account').
factory('Account', function($q, $http, $timeout, api) {
    obj = {

      // well use this to get the http bit, then post process it normally?
      getAccounts: function() {
        var deferred = $q.defer();

        $http.get(api.getUrl() + '/accounts', {headers: api.getHeaders()})
          .success(function(data) {

            var accounts = [];

            accounts = obj.getSubAccounts(data, 0);

            for (var i in accounts) {
              accounts[i] = obj.formatAccount(accounts[i]);
            }

            deferred.resolve(accounts);
          })
          .error(function(data, status) {
            api.handleErrors(data, status, 'accounts');
          })
        ;

        return deferred.promise;
      },

      getAccount: function(accountGuid) {
        var deferred = $q.defer();

        $http.get(api.getUrl() + '/accounts/' + accountGuid, {headers: api.getHeaders()})
          .success(function(data) {
            deferred.resolve(data);
          })
          .error(function(data, status) {
            api.handleErrors(data, status, 'accounts');
          })
        ;

        return deferred.promise;
      },

      getSplits: function(account) {
        var deferred = $q.defer();

        $http.get(api.getUrl() + '/accounts/' + account.guid + '/splits', {headers: api.getHeaders()})
          .success(function(splits) {

            for (var i in splits) {
              splits[i] = obj.formatSplit(splits[i], account);
            }

            deferred.resolve(splits);
          })
          .error(function(data, status) {
            api.handleErrors(data, status, 'accounts');
          })
        ;

        return deferred.promise;
      },

      formatSplit: function(split, account) {
        if (account.type_id == 0) {
          if (split.amount > 0) {
            split.income = format_currency(account.type_id, account.currency, split.amount);
            split.charge = '';
          } else {
            split.income = '';
            split.charge = format_currency(account.type_id, account.currency, -split.amount);
          }
        } else if (account.type_id != 8) {
          split.charge = format_currency(8, account.currency, split.amount);
          split.income = '';
        } else {
          split.income = format_currency(8, account.currency, split.amount);
          split.charge = '';
        }

        split.balance = format_currency(account.type_id, account.currency, split.balance);
        split.amount = format_currency(account.type_id, account.currency, split.amount);
        
        /*if (account.type_id == 8) {
          split.balance = -(split.balance);
          split.amount = -(split.amount);
        }*/

        return split;
      },

      // this could be not exposed
      formatAccount: function(account) {
        account.balance_html = format_currency(account.type_id, account.currency, account.balance);
        account.balance_gbp_html = format_currency(account.type_id, account.currency, account.balance_gbp);

        return account;
      },
      
      // this could be not exposed
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
      }

    }

    // could only expose certain functions
    return obj;
  }
);