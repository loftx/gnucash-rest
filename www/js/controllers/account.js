function AccountListCtrl($scope, $route, $uibModal, Account, Money) {
	
	// could also handle some errors here?
	Account.query().then(function(accounts) {
		$scope.accounts = accounts;
	});

	$scope.emptyAccount = function() {

		guid = 0;

		var popup = $uibModal.open({
			templateUrl: 'partials/accounts/fragments/form.html',
			controller: 'modalEditAccountCtrl',
			size: 'lg',
			resolve: {
				guid: function () { return guid; }
			}
		});

		popup.result.then(function(account) {
			// this should just add it rather than reload
			$route.reload();
		});

	}
}

function AccountDetailCtrl($scope, $routeParams, $route, $uibModal, Account, Transaction, Dates) {

	$scope.account_types = Account.types();

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

	$scope.emptyTransaction = function() {

		guid = '';

		var popup = $uibModal.open({
			templateUrl: 'partials/accounts/fragments/transactionform.html',
			controller: 'modalEditTransactionCtrl',
			size: 'lg',
			resolve: {
				guid: function () { return guid; },
				account: function () { return $scope.account; }
			}
		});

		popup.result.then(function(transaction) {
			// this should just add it rather than reload
			$route.reload();
		});

	}

	$scope.getTransactionSplit = function(guid) {

		Transaction.get(guid).then(function(transaction) {

			// order splits so split from this account is first
			/*for (var i = 0; i < transaction.splits.length; i++) {
				if (transaction.splits[i].account.guid == $scope.account.guid) {
					if (i > 0) {
						var accountsplit = transaction.splits[i];
						transaction.splits.splice(i, 1);
						transaction.splits.unshift(accountsplit);
					}
				}
			}*/

			// apply formatting to new splits
			for (var i = 0; i < transaction.splits.length; i++) {
				transaction.splits[i] = Account.formatSplit(transaction.splits[i], transaction.splits[i].account);
				console.log(transaction.splits[i]);
			}

			// find the requested transaction in the splits list and add the full splits list to it
			for (var i = 0; i < $scope.splits.length; i++) {
				if ($scope.splits[i].transaction.guid == transaction.guid) {
					$scope.splits[i].transaction.splits = transaction.splits;
				}
			}

		});

	}

	$scope.populateTransaction = function(guid) {

		var popup = $uibModal.open({
			templateUrl: 'partials/accounts/fragments/transactionform.html',
			controller: 'modalEditTransactionCtrl',
			size: 'lg',
			resolve: {
				guid: function () { return guid; },
				account: function () { return $scope.account; }
			}
		});

		popup.result.then(function(transaction) {
			// this should just edit it rather than reload
			$route.reload();
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

// this is bad due to the case...
app.controller('modalEditAccountCtrl', ['guid', '$scope', '$uibModalInstance', 'Account', 'Money', function(guid, $scope, $uibModalInstance, Account, Money) {

	$scope.currencys = Money.currencys();
	$scope.account_types = Account.types();

	Account.getAccountsForDropdown({
		'includeRoot': true,
		'includePlaceholderAccounts': true
	}).then(function(accounts) {
		$scope.dropdown_accounts = accounts;
	});

	$scope.accountError = '';

	if (guid == 0) {
		$scope.accountTitle = 'Add account';

		$scope.accountNew = 1;

		$scope.account = {};
		$scope.account.guid = '';
		$scope.account.name = '';
		$scope.account.currency = '';
		$scope.account.type_id = '';
		$scope.account.parent_guid = '';
	} else {
		Account.get(guid).then(function(account) {
			$scope.accountTitle = 'Edit account';
			$scope.accountNew = 0;
			$scope.account = account;
		});
	}

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.saveAccount = function() {

		if ($scope.accountNew == 1) {

			var params = {
				name: $scope.account.name,
				currency: $scope.account.currency,
				account_type_id: $scope.account.type_id,
				parent_account_guid: $scope.account.parent_guid
			};

			Account.add(params).then(function(account) {
				$scope.accountError = '';
	 			$uibModalInstance.close(account);	
			}, function(data) {
				// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
				if(typeof data.errors != 'undefined') {
					$scope.accountError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});
			
		} else {			

			// TBC

		}
	}

}]);

// this is bad due to the case...
app.controller('modalEditTransactionCtrl', ['guid', 'account', '$scope', '$uibModalInstance', 'Account', 'Transaction', 'Dates', function(guid, account, $scope, $uibModalInstance, Account, Transaction, Dates) {

	Account.query().then(function(accounts) {
		$scope.accounts = accounts;
	});

	$scope.picker = {
		transactionDatePosted: { opened: false },
		open: function(field) { $scope.picker[field].opened = true; },
		options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
	};

	$scope.transactionError = '';

	if (guid == '') {

		$scope.transactionTitle = 'Add transaction';
		$scope.transactionNew = 1;
		$scope.transaction = {};

		$scope.transaction.num = '';
		$scope.transaction.date_posted = '';
		$scope.transaction.description = '';
		$scope.transaction.splitAccount1 = '';
		$scope.transaction.splitValue1 = '';


	} else {

		Transaction.get(guid).then(function(transaction) {
			$scope.transactionTitle = 'Edit transaction';
			$scope.transactionNew = 0;

			$scope.transaction = transaction;

			$scope.transaction.date_posted = Dates.dateOutput($scope.transaction.date_posted);

			// TODO: this is a mess as it only handles 2 splits, and will remove any others on updateTransaction - it also confuses the form with the splits, so the splits will be swapped when their resubmitted.
			if ($scope.transaction.splits.length == 2) {
				if ($scope.transaction.splits[0].account.guid == account.guid) {

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

		});

	}

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.saveTransaction = function() {

		if ($scope.transactionNew == 1) {

			var params = {
				currency: account.currency,
				num: $scope.transaction.num,
				date_posted: ($scope.transaction.date_posted == '' ? '' : Dates.dateInput($scope.transaction.date_posted)),
				description: $scope.transaction.description,
				splitaccount1: $scope.transaction.splitAccount1,
				splitaccount2: account.guid
			};

			if (
				account.type_id == ACCT_TYPE_EXPENSE
			) {
				params.splitvalue1 = -$scope.transaction.splitValue1;
				params.splitvalue2 = $scope.transaction.splitValue1;
			} else {
				params.splitvalue1 = $scope.transaction.splitValue1;
				params.splitvalue2 = -$scope.transaction.splitValue1;
			}

			Transaction.add(params).then(function(transaction) {

				$scope.transactionError = '';
	 			$uibModalInstance.close(transaction);

			}, function(data) {
				// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
				if(typeof data.errors != 'undefined') {
					$scope.transactionError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});
			
		} else {

			var params = {
				currency: account.currency,
				num: $scope.transaction.num,
				date_posted: Dates.dateInput($scope.transaction.date_posted),
				description: $scope.transaction.description,
				splitguid1: $scope.transaction.splitGuid1,
				splitaccount1: $scope.transaction.splitAccount1,
				splitguid2: $scope.transaction.splitGuid2,
				splitaccount2: account.guid
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
				
				$scope.transactionError = '';
	 			$uibModalInstance.close(transaction);  

			}, function(data) {
				if(typeof data.errors != 'undefined') {
					$scope.transactionError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});

		}
	}

}]);