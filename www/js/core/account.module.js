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

            // could this be wrapped up in another function
            for (var account in accounts) {
              accounts[account].balance_html = format_currency(accounts[account].type_id, accounts[account].currency, accounts[account].balance);
              accounts[account].balance_gbp_html = format_currency(accounts[account].type_id, accounts[account].currency, accounts[account].balance_gbp);
            }

            deferred.resolve(accounts);
          })
          .error(function(data, status) {
            api.handleErrors(data, status);
          })
        ;

        return deferred.promise;
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