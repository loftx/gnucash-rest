function AccountListCtrl($scope, Account) {
	// could also handle some errors here?
	Account.getAccounts().then(function(accounts) {
		$scope.accounts = accounts;
	});
}

function AccountDetailCtrl($scope, $routeParams, $http, $timeout, $route, Account) {

	Account.getAccount($routeParams.accountGuid).then(function(account) {
		$scope.account = account;

		Account.getSplits(account).then(function(splits) {
			$scope.splits = splits;
		});
	});

	Account.getAccountsForDropdown($routeParams.accountGuid).then(function(accounts) {
		$scope.accounts = accounts;
	});

	$('#transactionDatePosted').datepicker({
		'dateFormat': 'yy-mm-dd',
		'onSelect': function(dateText) {
			if (window.angular && angular.element) {
				angular.element(this).controller("ngModel").$setViewValue(dateText);
			}
		}
	});

	$scope.addTransaction = function() {

		var data = {
			currency: 'GBP',
			num: $scope.transaction.num,
			date_posted: $scope.transaction.date_posted,
			description: $scope.transaction.description,
			//splitvalue1: $scope.transaction.splitValue1*100,
			splitaccount1: $scope.transaction.splitAccount1,
			//splitvalue2: -$scope.transaction.splitValue1*100,
			splitaccount2: $scope.account.guid
		};

		if ($scope.account.type_id == 0) { // bank
			data.splitvalue1 = -Math.round($scope.transaction.splitValue1*100);
			data.splitvalue2 = Math.round($scope.transaction.splitValue1*100);
		} else {
			data.splitvalue1 = Math.round($scope.transaction.splitValue1*100);
			data.splitvalue2 = -Math.round($scope.transaction.splitValue1*100);
		}

		$http({
			method: 'POST',
			url: '/api/transactions',
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			//$scope.invoice.entries.push(data);
			$('#transactionForm').modal('hide');
			$('#transactionAlert').hide();

			$scope.transaction.num = '';
			$scope.transaction.date_posted = '';
			$scope.transaction.description = '';
			$scope.transaction.splitAccount1 = '';
			$scope.transaction.splitValue1 = '';

			$route.reload();
			
		}).error(function(data, status, headers, config) {
			if(typeof data.errors != 'undefined') {
				$('#transactionAlert').show();
				$scope.transactionError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});
	}

	$scope.emptyTransaction = function() {

		$scope.transactionTitle = 'Add transaction';

		$scope.transactionNew = 1;

		$scope.transaction = {};

		$scope.transaction.num = '';
		$scope.transaction.date_posted = '';
		$scope.transaction.description = '';
		$scope.transaction.splitAccount1 = '';
		$scope.transaction.splitValue1 = '';

		$('#transactionForm').modal('show');

	}

	$scope.populateTransaction = function(guid) {

		$http.get('/api/transactions/' + guid)
			.success(function(data) {
				$scope.transactionTitle = 'Edit transaction';
				$scope.transactionNew = 0;

				$scope.transaction = data;

				if ($scope.transaction.splits.length == 2) {
					if ($scope.transaction.splits[0].account.guid == $routeParams.accountGuid) {
						$scope.transaction.splitGuid1 = $scope.transaction.splits[1].guid;
						$scope.transaction.splitAccount1 = $scope.transaction.splits[1].account.guid;
						$scope.transaction.splitValue1 = $scope.transaction.splits[1].amount;
						$scope.transaction.splitGuid2 = $scope.transaction.splits[0].guid;
						$scope.transaction.splitAccount2 = $scope.transaction.splits[0].account.guid;
						$scope.transaction.splitValue2 = $scope.transaction.splits[0].amount;
					} else {
						$scope.transaction.splitGuid1 = $scope.transaction.splits[0].guid;
						$scope.transaction.splitAccount1 = $scope.transaction.splits[0].account.guid;
						$scope.transaction.splitValue1 = $scope.transaction.splits[0].amount;
						$scope.transaction.splitGuid2 = $scope.transaction.splits[1].guid;
						$scope.transaction.splitAccount2 = $scope.transaction.splits[1].account.guid;
						$scope.transaction.splitValue2 = $scope.transaction.splits[1].amount;
					}
				}

				$('#transactionForm').modal('show');
			})
			.error(function(data, status) {
				handleApiErrors($timeout, data, status);
			})
		;

	}

	$scope.saveTransaction = function() {
		if ($scope.transactionNew == 1) {
			$scope.addTransaction();
		} else {
			// This may fail as it's possible to update the ID
			$scope.updateTransaction($scope.transaction.guid);
		}
	}

	$scope.updateTransaction = function(guid) {

		var data = {
			currency: 'GBP',
			num: $scope.transaction.num,
			date_posted: $scope.transaction.date_posted,
			description: $scope.transaction.description,
			splitguid1: $scope.transaction.splitGuid1,
			splitvalue1: $scope.transaction.splitValue1*100,
			splitaccount1: $scope.transaction.splitAccount1,
			splitguid2: $scope.transaction.splitGuid2,
			splitvalue2: -$scope.transaction.splitValue1*100,
			splitaccount2: $scope.account.guid
		};

		$http({
			method: 'POST',
			url: '/api/transactions/' + guid,
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			$('#transactionForm').modal('hide');
			$('#transactionAlert').hide();

			$route.reload();

			/*for (var i = 0; i < $scope.customers.length; i++) {
				if ($scope.customers[i].id == data.id) {
					$scope.customers[i] = data;
				}
			}

			$('#customerForm').modal('hide');
			$('#customerAlert').hide();

			$scope.customer.id = '';
			$scope.customer.name = '';
			$scope.customer.address.name = '';
			$scope.customer.address.line_1 = '';
			$scope.customer.address.line_2 = '';
			$scope.customer.address.line_3 = '';
			$scope.customer.address.line_4 = '';
			$scope.customer.address.phone = '';
			$scope.customer.address.fax = '';
			$scope.customer.address.email = '';*/
			
		}).error(function(data, status, headers, config) {
			if(typeof data.errors != 'undefined') {
				$('#transactionAlert').show();
				$scope.transactionError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});
	}

	$scope.deleteTransaction = function(guid) {

		$http({
			method: 'DELETE',
			url: '/api/transactions/' + guid
		}).success(function(data) {

			for (var i = 0; i < $scope.splits.length; i++) {
				if ($scope.splits[i].transaction.guid == guid) {
					$scope.splits.splice(i, 1);
				}
			}
			
		}).error(function(data, status) {
			handleApiErrors($timeout, data, status);
		});

	}

}