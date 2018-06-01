function AccountListCtrl($scope, Account, Money) {

	$scope.account = {};
	$scope.account.guid = '';
	$scope.account.name = '';
	$scope.account.currency = '';
	$scope.account.type_id = '';
	$scope.account.parent_guid = '';
	

	$scope.currencys = Money.currencys();
	$scope.account_types = Account.types();

	// could also handle some errors here?
	Account.query().then(function(accounts) {
		$scope.accounts = accounts;
	});

	Account.getAccountsForDropdown({ 'includeRoot': true }).then(function(accounts) {
		$scope.dropdown_accounts = accounts;
	});

	$scope.addAccount = function() {

		var params = {
			name: $scope.account.name,
			currency: $scope.account.currency,
			account_type_id: $scope.account.type_id,
			parent_account_guid: $scope.account.parent_guid
		};

		Account.add(params).then(function(account) {
			//$scope.accounts.push(account);
			$('#accountForm').modal('hide');
			$('#accountAlert').hide();

			$scope.account.guid = '';
			$scope.account.name = '';
			$scope.account.currency = '';
			$scope.account.type_id = '';
			$scope.account.parent_guid = '';

		}, function(data) {
			// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
			if(typeof data.errors != 'undefined') {
				$('#accountAlert').show();
				$scope.accountError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});

	}

	$scope.saveAccount = function() {
		if ($scope.accountNew == 1) {
			$scope.addAccount();
		} else {
			// TODO: updating account
		}
	}

	$scope.emptyAccount = function() {

		$scope.accountTitle = 'Add account';

		$scope.accountNew = 1;

		$scope.account.guid = '';
		$scope.account.name = '';
		$scope.account.currency = '';
		$scope.account.type_id = '';
		$scope.account.parent_guid = '';

		$('#accountForm').modal('show');

	}
}

function AccountDetailCtrl($scope, $routeParams, $route, Account, Transaction, Dates) {

	$scope.picker = {
		transactionDatePosted: { opened: false },
		open: function(field) { $scope.picker[field].opened = true; },
		options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
	};

	Account.get($routeParams.accountGuid).then(function(account) {
		$scope.account = account;

		Account.getSplits(account, {}).then(function(splits) {
			$scope.splits = splits;
		});
	});

	Account.getAccountsForDropdown($routeParams.accountGuid).then(function(accounts) {
		$scope.accounts = accounts;
	});

	$scope.addTransaction = function() {

		var params = {
			currency: $scope.account.currency,
			num: $scope.transaction.num,
			date_posted: Dates.dateInput($scope.transaction.date_posted),
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
			
			$('#transactionForm').modal('hide');
			$('#transactionAlert').hide();

			$scope.transaction.num = '';
			$scope.transaction.date_posted = '';
			$scope.transaction.description = '';
			$scope.transaction.splitAccount1 = '';
			$scope.transaction.splitValue1 = '';

			// this should just add it rather than reload
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

			$scope.transaction.date_posted = Dates.dateOutput($scope.transaction.date_posted);

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
			currency: $scope.account.currency,
			num: $scope.transaction.num,
			date_posted: Dates.dateInput($scope.transaction.date_posted),
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

			// this should just update it rather than reload but the above updates don't work very well
			$route.reload();


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