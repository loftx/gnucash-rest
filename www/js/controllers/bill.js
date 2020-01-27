function BillListCtrl($scope, $uibModal, Vendor, Bill, Dates) {

	$scope.date_type = 'opened';
	$scope.date_from = Date.today().add(-3).months().toString('yyyy-MM-dd');
	$scope.date_to = '';
	$scope.is_paid = '';
	$scope.is_posted = '';
	$scope.is_active = '1'; // needs to be a string or isn't picked up by Angular...


	Vendor.query().then(function(vendors) {
		$scope.vendors = vendors;
	});

	$scope.bill = {};
	$scope.bill.id = '';
	$scope.bill.vendor_id = '';
	$scope.bill.date_opened = '';
	$scope.bill.notes = '';

	var lastParams = '';

	$scope.$on('$viewContentLoaded', function() {
		$('#billDateFrom').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});

		$('#billDateTo').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});
	});

	$scope.change = function() {

		var params = {
			'date_from': $scope.date_from,
			'date_to': $scope.date_to,
			'date_type': $scope.date_type,
			'is_paid': $scope.is_paid,
			'is_active': $scope.is_active
		};
		
		if (params != lastParams) {
			
			// Using $scope.bills = Bills.query(params); causes "$scope.bills.push is not a function" - probably because it's a promise not an array...
			Bill.query(params).then(function(bills) {
				$scope.bills = bills;
			});

			lastParams = params;
		}
		
	}

	// copied from vendor.js
	$scope.addBill = function() {

		for (var i = 0; i < $scope.vendors.length; i++) {
			if ($scope.vendors[i].id == $scope.bill.vendor_id) {
				$scope.bill.vendor_currency = $scope.vendors[i].currency;
			}
		}

		var params = {
			id: '',
			vendor_id: $scope.bill.vendor_id,
			currency: $scope.bill.vendor_currency,
			date_opened: $scope.bill.date_opened,
			notes: $scope.bill.notes
		};

		Bill.add(params).then(function(bill) {
			$scope.bills.push(bill);
			$('#billForm').modal('hide');
			$('#billAlert').hide();

			$scope.bill.id = '';
			$scope.bill.vendor_id = '';
			$scope.bill.date_opened = '';
			$scope.bill.notes = '';
		}, function(data) {
			if(typeof data.errors != 'undefined') {
				$('#billAlert').show();
				$scope.billError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});

	}

	// copied from vendor.js
	$scope.saveBill = function() {
		if ($scope.billNew == 1) {
			$scope.addBill();
		} else {
			// This may fail as it's possible to update the ID
			//$scope.updateBill($scope.bill.id);
		}
	}

	// copied from bill.js
	$scope.emptyPostBill = function(id) {

		$scope.bill.id = id;
		$scope.bill.date_posted = Dates.format_todays_date();
		$scope.bill.date_due = Dates.format_todays_date();
		$scope.bill.posted_accumulatesplits = true;

		var popup = $uibModal.open({
			templateUrl: 'partials/bills/fragments/postform.html',
			controller: 'modalPostBillCtrl',
			size: 'sm',
			resolve: {
				bill: function () {
				  return $scope.bill;
				}
			}
		});

		popup.result.then(function(bill) {
			for (var i in $scope.bills) {
				if ($scope.bills[i].id == $scope.bill.id) {
					$scope.bills[i] = bill;
				}
			}
		});

	}

	
	$scope.emptyPayBill = function(id) {

		$scope.bill.id = id;
		$scope.bill.date_paid = Dates.todays_date();

		var popup = $uibModal.open({
			templateUrl: 'partials/bills/fragments/payform.html',
			controller: 'modalPayBillCtrl',
			size: 'sm',
			resolve: {
				bill: function () {
				  return $scope.bill;
				}
			}
		});

		popup.result.then(function(bill) {
			for (var i in $scope.bills) {
				if ($scope.bills[i].id == $scope.bill.id) {
					$scope.bills[i] = bill;
				}
			}
		});

	}

	// copied from vendor.js - but removed vendor line
	$scope.emptyBill = function() {

		$scope.billTitle = 'Add bill';

		$scope.billNew = 1;

		$scope.bill.id = '';
		$scope.bill.date_opened = Dates.format_todays_date();
		$scope.bill.notes = '';

		$('#billForm').modal('show');

	}

	$scope.change();

}

function BillDetailCtrl($scope, $routeParams, $uibModal, Bill, Vendor, Account, Entry, Dates) {

	Vendor.query().then(function(vendors) {
		$scope.vendors = vendors;
	});

	Account.getBillAccountsForDropdown().then(function(accounts) {
		$scope.accounts = accounts;
	});

	Bill.get($routeParams.billId).then(function(bill) {
		$scope.bill = bill;
		// used to set vendor on edit form
		$scope.bill.vendor_id = $scope.bill.owner.id;
	});

	$scope.entry = {};
	$scope.entry.bill_account = {};

	$scope.entry.guid = '';
	$scope.entry.date = '';
	$scope.entry.description = '';
	$scope.entry.bill_account.guid = '';
	$scope.entry.quantity = '';
	$scope.entry.bill_price = '';

	$scope.$on('$viewContentLoaded', function() {
		$('#entryDate').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});

		$('#billDateOpened').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});
	});

	$scope.populateBill = function(id) {

		$scope.billTitle = 'Edit bill';
		$('#billForm').modal('show');

	}

	$scope.saveBill = function() {

		var params = {
			id: $scope.bill.id,
			active: $scope.bill.active,
			vendor_id: $scope.bill.owner.id,
			currency: $scope.bill.currency,
			date_opened: $scope.bill.date_opened,
			notes: $scope.bill.notes
		};

		Bill.update($scope.bill.id, params).then(function(bill) {
			
			$scope.bill = bill;

			$('#billForm').modal('hide');
			$('#billAlert').hide();

		}, function(data) {
			if(typeof data.errors != 'undefined') {
				$('#billAlert').show();
				$scope.billError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});

	}

	$scope.emptyPostBill = function() {

		$scope.bill.date_posted = Dates.format_todays_date();
		$scope.bill.date_due = Dates.format_todays_date();
		$scope.bill.posted_accumulatesplits = true;

		var popup = $uibModal.open({
			templateUrl: 'partials/bills/fragments/postform.html',
			controller: 'modalPostBillCtrl',
			size: 'sm',
			resolve: {
				bill: function () {
				  return $scope.bill;
				}
			}
		});

		popup.result.then(function(bill) {
			$scope.bill = bill;
		});

	}

	$scope.emptyPayBill = function() {

		$scope.bill.date_paid = Dates.todays_date();

		var popup = $uibModal.open({
			templateUrl: 'partials/bills/fragments/payform.html',
			controller: 'modalPayBillCtrl',
			size: 'sm',
			resolve: {
				bill: function () {
				  return $scope.bill;
				}
			}
		});

		popup.result.then(function(bill) {
			$scope.bill = bill;
		});

	}

	$scope.addEntry = function() {

		var params = {
			date: $scope.entry.date,
			description: $scope.entry.description,
			account_guid: $scope.entry.bill_account.guid,
			quantity: $scope.entry.quantity,
			price: $scope.entry.bill_price
		};

		Entry.add('bill', $scope.bill.id, params).then(function(entry) {
			
			$scope.bill.entries.push(entry);

			$scope.bill = Bill.recalculate($scope.bill);

			$('#entryForm').modal('hide');
			$('#entryAlert').hide();

			$scope.entry.guid = '';
			$scope.entry.date = '';
			$scope.entry.description = '';
			$scope.entry.bill_account.guid = '';
			$scope.entry.quantity = '';
			$scope.entry.bill_price = '';

		}, function(data) {
			if(typeof data.errors != 'undefined') {
				$('#entryAlert').show();
				$scope.entryError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});

	}

	$scope.saveEntry = function() {
		if ($scope.entryNew == 1) {
			$scope.addEntry();
		} else {
			// This may fail as it's possible to update the ID
			$scope.updateEntry($scope.entry.guid);
		}
	}

	$scope.emptyEntry = function() {

		$scope.entryTitle = 'Add entry';

		$scope.entryNew = 1;

		$scope.entry.guid = '';
		$scope.entry.date = Dates.format_todays_date(); // this should probably default to the bill date - not today's
		$scope.entry.description = '';
		$scope.entry.bill_account.guid = '';
		$scope.entry.quantity = '';
		$scope.entry.bill_price = '';

		$('#entryForm').modal('show');

	}

	$scope.deleteEntry = function(guid) {

		Entry.delete(guid).then(function() {
			for (var i = 0; i < $scope.bill.entries.length; i++) {
				if ($scope.bill.entries[i].guid == guid) {
					$scope.bill.entries.splice(i, 1);
				}

				$scope.bill = Bill.recalculate($scope.bill);
			}
		}, function(data) {
			console.log(data);
		});

	}

	$scope.populateEntry = function(guid) {

		Entry.get(guid).then(function(entry) {
			$scope.entryTitle = 'Edit entry';
			$scope.entryNew = 0;
			$scope.entry = entry;
			$('#entryForm').modal('show');
		});

	}

	$scope.updateEntry = function(guid) {

		var params = {
			guid: $scope.entry.guid,
			date: $scope.entry.date,
			description: $scope.entry.description,
			account_guid: $scope.entry.bill_account.guid,
			quantity: $scope.entry.quantity,
			price: $scope.entry.bill_price,
		};

		Entry.update(guid, params).then(function(entry) {
			
			for (var i = 0; i < $scope.bill.entries.length; i++) {
				if ($scope.bill.entries[i].guid == entry.guid) {
					$scope.bill.entries[i] = entry;
				}
			}

			$scope.bill = Bill.recalculate($scope.bill);
			
			$('#entryForm').modal('hide');
			$('#entryAlert').hide();

			$scope.entry.guid = '';
			$scope.entry.date = '';
			$scope.entry.description = '';
			$scope.entry.inv_account.guid = '';
			$scope.entry.quantity = '';
			$scope.entry.inv_price = '';

		}, function(data) {
			if(typeof data.errors != 'undefined') {
				$('#entryAlert').show();
				$scope.entryError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});

	}

}

// this is bad due to the case...
app.controller('modalPostBillCtrl', ['bill', '$scope', '$uibModalInstance', 'Account', 'Bill', 'Dates', function(bill, $scope, $uibModalInstance, Account, Bill, Dates) {

	$scope.bill = {}
	$scope.bill.date_posted = Dates.todays_date();
	$scope.bill.date_due = Dates.todays_date();
	$scope.bill.posted_accumulatesplits = true;

	$scope.picker = {
		billDatePosted: { opened: false },
		billDateDue: { opened: false },
		open: function(field) { $scope.picker[field].opened = true; },
		options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
	};

	Account.getAccountsOfTypesForDropdown([ACCT_TYPE_PAYABLE]).then(function(accounts) {
		$scope.accounts = accounts;
		// fill in default posting account
		$scope.bill.posted_account = accounts[0].guid;
	});

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	// could change to generic function
	$scope.postBill = function() {

		Bill.get(bill.id).then(function(bill) {
			
			var params = {
				vendor_id: bill.owner.id,
				currency: bill.currency,
				date_opened: bill.date_opened,
				notes: bill.notes,
				posted: 1,
				posted_account_guid: $scope.bill.posted_account,
				posted_date: Dates.dateInput($scope.bill.date_posted),
				due_date: Dates.dateInput($scope.bill.date_due),
				posted_memo: $scope.bill.posted_memo,
				posted_accumulatesplits: $scope.bill.posted_accumulatesplits, // this is True but should be 1
				posted_autopay: 0
			};

			Bill.update(bill.id, params).then(function(bill) {

				$('#billPostAlert').hide();
				$uibModalInstance.close(bill);				

			}, function(data) {
				if(typeof data.errors != 'undefined') {
					$('#billPostAlert').show();
					$scope.billError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});

		});

	}

}]);

app.controller('modalPayBillCtrl', ['bill', '$scope', '$uibModalInstance', 'Account', 'Bill', 'Dates', function(bill, $scope, $uibModalInstance, Account, Bill, Dates) {

	$scope.bill = bill;

	$scope.picker = {
		billDatePaid: { opened: false },
		billDateDue: { opened: false },
		open: function(field) { $scope.picker[field].opened = true; },
		options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
	};
	
	Account.getAccountsOfTypesForDropdown([ACCT_TYPE_PAYABLE]).then(function(accounts) {
		$scope.accounts = accounts;
		// fill in default posting account
		$scope.bill.post_account = accounts[0].guid;
	});

	// needs placeholders
	Account.getAccountsOfTypesAndPlaceholdersForDropdown([ACCT_TYPE_BANK, ACCT_TYPE_ASSET, ACCT_TYPE_LIABILITY, ACCT_TYPE_CASH, ACCT_TYPE_CREDIT]).then(function(transferAccounts) {

		$scope.transferAccounts = transferAccounts;
	}); 

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.payBill = function() {
			
		var params = {
			posted_account_guid: bill.post_account,
			transfer_account_guid: bill.transfer_account,
			payment_date: Dates.dateInput(bill.date_paid),
			num: '',
			memo: '',
			auto_pay: 0,
		};

		Bill.pay(bill.id, params).then(function(bill) {
			
			$('#billPostAlert').hide();
			$uibModalInstance.close(bill);	

		}, function(data) {
			if(typeof data.errors != 'undefined') {
				$('#billPayAlert').show();
				$scope.billError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});

	}
	
}]);
