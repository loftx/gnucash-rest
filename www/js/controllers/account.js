function AccountListCtrl($scope, Account) {
	// could also handle some errors here?
	Account.query().then(function(accounts) {
		$scope.accounts = accounts;
	});
}

function AccountDetailCtrl($scope, $routeParams, $route, Account, Transaction) {

	Account.get($routeParams.accountGuid).then(function(account) {
		$scope.account = account;

		Account.getSplits(account, {}).then(function(splits) {
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

		var params = {
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
			params.splitvalue1 = -Math.round($scope.transaction.splitValue1*100);
			params.splitvalue2 = Math.round($scope.transaction.splitValue1*100);
		} else {
			params.splitvalue1 = Math.round($scope.transaction.splitValue1*100);
			params.splitvalue2 = -Math.round($scope.transaction.splitValue1*100);
		}

		Transaction.add(params).then(function(transaction) {
			
			//$scope.invoice.entries.push(data);
			$('#transactionForm').modal('hide');
			$('#transactionAlert').hide();

			$scope.transaction.num = '';
			$scope.transaction.date_posted = '';
			$scope.transaction.description = '';
			$scope.transaction.splitAccount1 = '';
			$scope.transaction.splitValue1 = '';

			$route.reload();

		}, function(data) {
			// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
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

		Transaction.get(guid).then(function(transaction) {
			$scope.transactionTitle = 'Edit transaction';
			$scope.transactionNew = 0;

			$scope.transaction = transaction;

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
		});

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

		var params = {
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

		Transaction.update(guid, params).then(function(transaction) {
			
			$('#transactionForm').modal('hide');
			$('#transactionAlert').hide();

			for (var i = 0; i < $scope.splits.length; i++) {
				if ($scope.splits[i].transaction.guid == transaction.guid) {
					for (var j = 0; j < transaction.splits.length; j++) {
						if ($scope.splits[i].guid == transaction.splits[j].guid) {
							$scope.splits[i] = transaction.splits[j];
						}
					}

					// add transaction and other split to the split as it doesn't appear
					for (var j = 0; j < transaction.splits.length; j++) {
						if ($scope.splits[i].guid != transaction.splits[j].guid) {
							console.log($scope.splits[i]);
							console.log(transaction.splits[j]);
							$scope.splits[i].other_split = transaction.splits[j];
							
							$scope.splits[i].transaction = transaction;
						}
					}
				}
			}

			$scope.transaction.num = '';
			$scope.transaction.date_posted = '';
			$scope.transaction.description = '';
			$scope.transaction.splitGuid1 = '';
			$scope.transaction.splitValue1 = '';
			$scope.transaction.splitAccount1 = '';
			$scope.transaction.splitGuid2 = '';
			$scope.transaction.splitValue1 = '';
			$scope.account.guid = '';


		}, function(data) {
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

		Transaction.delete(guid).then(function() {

			for (var i = 0; i < $scope.splits.length; i++) {
				if ($scope.splits[i].transaction.guid == guid) {
					$scope.splits.splice(i, 1);
				}
			}
			
		}, function(data) {
			console.log(data);
		});

	}

}