function ReportIncomeStatementCtrl($scope, Account, Money, Dates) {

	var monthNames = [ "January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December" ];

	$scope.months = [];
	$scope.currentMonth = 9;

	$scope.$on('$viewContentLoaded', function() {

		$scope.picker = {
			reportDateFrom: { opened: false },
			reportDateTo: { opened: false },
			open: function(field) { $scope.picker[field].opened = true; },
			options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
		};

	});

	for (var i=0; i>-10; i--) {
		var date_from = Date.today().set({ day: 1}).add({ months: i });
		var date_to = Date.today().set({ day: 1}).add({ months: i + 1 });
		
		$scope.months.unshift({
				'id': -i,
				'date_from': date_from,
				'date_to': date_to,
				'name': monthNames[date_from.getMonth()]
		});

	}

	$scope.setMonth = function(month_id) {
		$scope.currentMonth = 9-month_id;
		$scope.date_from = $scope.months[$scope.currentMonth].date_from;
		$scope.date_to = $scope.months[$scope.currentMonth].date_to;

		generateIncomeAccounts($scope, Account, Money, Dates);
	}

	$scope.date_from = $scope.months[$scope.currentMonth].date_from;
	$scope.date_to = $scope.months[$scope.currentMonth].date_to;

	generateIncomeAccounts($scope, Account, Money, Dates);

}

function generateIncomeAccounts($scope, Account, Money, Dates) {

	$scope.incomeTotal = 0;
	$scope.displayIncomeTotal = '£0.00';

	$scope.expensesTotal = 0;
	$scope.displayExpensesTotal = '£0.00';

	$scope.grandTotal = 0;
	$scope.displayGrandTotal = '£0.00';

	Account.query().then(function(accounts) {
		
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

		Account.get(incomeAccounts[0].guid).then(function(account) {

			$scope.incomeAccounts = Account.getSubAccounts(account, 0);

			var params = {
				'date_posted_from': Dates.dateInput($scope.date_from),
				'date_posted_to': Dates.dateInput($scope.date_to)
			};

			for (var i in $scope.incomeAccounts) {

				$scope.incomeAccounts[i].total = Money.format_currency($scope.incomeAccounts[i].type_id, $scope.incomeAccounts[i].currency, 0);
				
				Account.getSplits($scope.incomeAccounts[i], params).then(function(splits) {
					var accountAmount = 0;
					for (var split in splits) {
						accountAmount = accountAmount + splits[split].amount;
					
					}

					for (var j in $scope.incomeAccounts) {
						if (splits.length != 0 && $scope.incomeAccounts[j].guid == splits[0].account.guid) {
							$scope.incomeAccounts[j].total = Money.format_currency($scope.incomeAccounts[j].type_id, $scope.incomeAccounts[j].currency, accountAmount);
							$scope.incomeTotal =  $scope.incomeTotal + accountAmount;
							$scope.grandTotal = $scope.incomeTotal - $scope.expensesTotal;
							
						}
					}

					$scope.displayIncomeTotal = Money.format_currency(8, 'GBP', $scope.incomeTotal);
					$scope.displayGrandTotal = Money.format_currency(8, 'GBP', $scope.grandTotal);
				});
			}
		});

		Account.get(expensesAccounts[0].guid).then(function(accounts) {

			$scope.expensesAccounts = Account.getSubAccounts(accounts, 0);

			var params = {
				'date_posted_from': Dates.dateInput($scope.date_from),
				'date_posted_to': Dates.dateInput($scope.date_to)
			};

			for (var i in $scope.expensesAccounts) {


				$scope.expensesAccounts[i].total = Money.format_currency($scope.expensesAccounts[i].type_id, $scope.expensesAccounts[i].currency, 0);

				Account.getSplits($scope.expensesAccounts[i], params).then(function(splits) {

					var accountAmount = 0;
					for (var split in splits) {
						accountAmount = accountAmount + splits[split].amount;
					
					}

					for (var j in $scope.expensesAccounts) {
						if (splits.length != 0 && $scope.expensesAccounts[j].guid == splits[0].account.guid) {

							$scope.expensesAccounts[j].total = Money.format_currency($scope.expensesAccounts[j].type_id, $scope.expensesAccounts[j].currency, accountAmount);
							$scope.expensesTotal =  $scope.expensesTotal + accountAmount;
							$scope.grandTotal = $scope.incomeTotal - $scope.expensesTotal;
							
						}
					}

					$scope.displayExpensesTotal = Money.format_currency(0, 'GBP', $scope.expensesTotal);
					$scope.displayGrandTotal = Money.format_currency(8, 'GBP', $scope.grandTotal);

				});

			}	

		});

	});

}