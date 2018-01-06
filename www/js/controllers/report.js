function ReportIncomeStatementCtrl($scope, $http, $timeout) {

	var monthNames = [ "January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December" ];

	$scope.months = [];
	$scope.currentMonth = 9;

	for (var i=0; i>-10; i--) {
		var date_from = Date.today().set({ day: 1}).add({ months: i });
		var date_to = Date.today().set({ day: 1}).add({ months: i + 1 });
		
		$scope.months.unshift({
				'id': -i,
				'date_from': date_from.getFullYear() + '-' + pad(date_from.getMonth() + 1) + '-01',
				'date_to': date_to.getFullYear() + '-' + pad(date_to.getMonth() + 1) + '-01',
				'name': monthNames[date_from.getMonth()]
		});
	}

	$scope.setMonth = function(month_id) {
		$scope.currentMonth = 9-month_id;
		generateIncomeAccounts($scope, $http);
	}

	generateIncomeAccounts($scope, $http);

}

function generateIncomeAccounts($scope, $http, $timeout) {

	$scope.incomeTotal = 0;
	$scope.displayIncomeTotal = '';

	$scope.expensesTotal = 0;
	$scope.displayExpensesTotal = '';

	$scope.grandTotal = 0;
	$scope.displayGrandTotal = '';

	$http.get('/api/accounts')
		.success(function(data) {
			var accounts = getSubAccounts($http, $timeout, data, 0);

			var incomeAccounts = [];
			var expensesAccounts = [];

			for (var account in accounts) {
				// would it be good if there was a way of returning flat accounts by type?
				if (accounts[account].type_id == 8 && accounts[account].level == 0) {
					incomeAccounts.push(accounts[account]);
				} else if (accounts[account].type_id == 9 && accounts[account].level == 0) {
					expensesAccounts.push(accounts[account]);
				}
			}

			$http.get('/api/accounts/' + incomeAccounts[0].guid)
				.success(function(data) {
					$scope.incomeAccounts = getSubAccounts($http, $timeout, data, 0);		
					for (var account in $scope.incomeAccounts) {
						$http.get('/api/accounts/' + $scope.incomeAccounts[account].guid + '/splits?date_posted_from=' + $scope.months[$scope.currentMonth].date_from + '&date_posted_to=' + $scope.months[$scope.currentMonth].date_to, {'account_id': account})
							.success(function(data, status, headers, config) {
								var accountAmount = 0;
								for (var split in data) {
									accountAmount = accountAmount + data[split].amount;
								
								}
								$scope.incomeAccounts[config.account_id].total = format_currency($scope.incomeAccounts[config.account_id].type_id, $scope.incomeAccounts[config.account_id].currency, accountAmount);
								$scope.incomeTotal =  $scope.incomeTotal + accountAmount;
								$scope.displayIncomeTotal = format_currency(8, 'GBP', $scope.incomeTotal);
								$scope.grandTotal = $scope.incomeTotal + $scope.expensesTotal;
								$scope.displayGrandTotal = format_currency(8, 'GBP', $scope.grandTotal);
							})
							.error(function(data, status) {
								handleApiErrors($timeout, data, status);
							})
						;
					}	
				})
				.error(function(data, status) {
					handleApiErrors($timeout, data, status);
				})
			;

			$http.get('/api/accounts/' + expensesAccounts[0].guid)
				.success(function(data) {
					$scope.expensesAccounts = getSubAccounts($http, $timeout, data, 0);		
					for (var account in $scope.expensesAccounts) {
						$http.get('/api/accounts/' + $scope.expensesAccounts[account].guid + '/splits?date_posted_from=' + $scope.months[$scope.currentMonth].date_from + '&date_posted_to=' + $scope.months[$scope.currentMonth].date_to, {'account_id': account})
							.success(function(data, status, headers, config) {
								var accountAmount = 0;
								for (var split in data) {
									accountAmount = accountAmount + data[split].amount;
								
								}
								$scope.expensesAccounts[config.account_id].total = format_currency($scope.expensesAccounts[config.account_id].type_id, $scope.expensesAccounts[config.account_id].currency, accountAmount);
								$scope.expensesTotal =  $scope.expensesTotal + accountAmount;
								$scope.displayExpensesTotal = format_currency(0, 'GBP', $scope.expensesTotal);
								$scope.grandTotal = $scope.incomeTotal + $scope.expensesTotal;
								$scope.displayGrandTotal = format_currency(8, 'GBP', $scope.grandTotal);
							})
							.error(function(data, status) {
								handleApiErrors($timeout, data, status);
							})
						;
					}	
				})
				.error(function(data, status) {
					handleApiErrors($timeout, data, status);
				})
			;

		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

}