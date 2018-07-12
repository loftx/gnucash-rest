function AccountListCtrl($scope, $route, Account, Money) {

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
			$('#accountForm').modal('hide');
			$('#accountAlert').hide();

			$scope.account.guid = '';
			$scope.account.name = '';
			$scope.account.currency = '';
			$scope.account.type_id = '';
			$scope.account.parent_guid = '';

			// should add rather than reload
			//$scope.accounts.push(account);
			$route.reload();

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

	$scope.account_types = Account.types();

	$scope.picker = {
		transactionDatePosted: { opened: false },
		open: function(field) { $scope.picker[field].opened = true; },
		options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
	};

	Account.get($routeParams.accountGuid).then(function(account) {
		$scope.account = account;

		// wrap in function?
		$scope.account_type = $scope.account_types.filter(function (account_types) { return account_types.key === $scope.account.type_id; })[0];

		Account.getSplits(account, {}).then(function(splits) {
			$scope.splits = splits;
		});
	});

	Account.getAccountsForDropdown().then(function(accounts) {
		$scope.accounts = accounts;
	});

	$scope.addTransaction = function() {

		var params = {
			currency: $scope.account.currency,
			num: $scope.transaction.num,
			date_posted: ($scope.transaction.date_posted == '' ? '' : Dates.dateInput($scope.transaction.date_posted)),
			description: $scope.transaction.description,
			splitaccount1: $scope.transaction.splitAccount1,
			splitaccount2: $scope.account.guid
		};

		if (
			$scope.account.type_id == ACCT_TYPE_EXPENSE
		) {
			params.splitvalue1 = -$scope.transaction.splitValue1;
			params.splitvalue2 = $scope.transaction.splitValue1;
		} else {
			params.splitvalue1 = $scope.transaction.splitValue1;
			params.splitvalue2 = -$scope.transaction.splitValue1;
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

			// TODO: this is a mess as it only handles 2 splits, and will remove any others on updateTransaction - it also confuses the form with the splits, so the splits will be swapped when their resubmitted.
			if ($scope.transaction.splits.length == 2) {
				if ($scope.transaction.splits[0].account.guid == $routeParams.accountGuid) {

					$scope.transaction.splitGuid1 = $scope.transaction.splits[1].guid;
					$scope.transaction.splitAccount1 = $scope.transaction.splits[1].account.guid;
					$scope.transaction.splitAccountType1 = $scope.transaction.splits[1].account.type_id;
					$scope.transaction.splitGuid2 = $scope.transaction.splits[0].guid;
					$scope.transaction.splitAccount2 = $scope.transaction.splits[0].account.guid;
					$scope.transaction.splitAccountType2 = $scope.transaction.splits[0].account.type_id;

					// reverse amount for certain account types
					if (
						$scope.transaction.splits[0].account.type_id == ACCT_TYPE_EXPENSE
					) {
						$scope.transaction.splitValue1 = $scope.transaction.splits[0].amount;
						$scope.transaction.splitValue2 = $scope.transaction.splits[1].amount;
					} else {
						$scope.transaction.splitValue1 = $scope.transaction.splits[1].amount;
						$scope.transaction.splitValue2 = $scope.transaction.splits[0].amount;
					}
				} else {
					$scope.transaction.splitGuid1 = $scope.transaction.splits[0].guid;
					$scope.transaction.splitAccount1 = $scope.transaction.splits[0].account.guid;
					$scope.transaction.splitAccountType1 = $scope.transaction.splits[0].account.type_id;
					$scope.transaction.splitGuid2 = $scope.transaction.splits[1].guid;
					$scope.transaction.splitAccount2 = $scope.transaction.splits[1].account.guid;
					$scope.transaction.splitAccountType2 = $scope.transaction.splits[1].account.type_id;

					// reverse amount for certain account types
					if (
						$scope.transaction.splits[1].account.type_id == ACCT_TYPE_EXPENSE
					) {
						$scope.transaction.splitValue1 = $scope.transaction.splits[1].amount;
						$scope.transaction.splitValue2 = $scope.transaction.splits[0].amount;
					} else {
						$scope.transaction.splitValue1 = $scope.transaction.splits[0].amount;
						$scope.transaction.splitValue2 = $scope.transaction.splits[1].amount;
					}
				}
			} else {
				alert('TODO: fix editing of multisplit transactions.')
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
			splitaccount1: $scope.transaction.splitAccount1,
			splitguid2: $scope.transaction.splitGuid2,
			splitaccount2: $scope.account.guid
		};

		if (
			$scope.transaction.splitAccountType2 == ACCT_TYPE_EXPENSE
		) {
			params.splitvalue1 = -$scope.transaction.splitValue1;
			params.splitvalue2 = $scope.transaction.splitValue1;
		} else {
			params.splitvalue1 = $scope.transaction.splitValue1;
			params.splitvalue2 = -$scope.transaction.splitValue1;
		}

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