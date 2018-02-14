function BillListCtrl($scope, Vendor, Bill) {

	$scope.date_type = 'opened';
	$scope.date_from = Date.today().add(-3).months().toString('yyyy-MM-dd');
	$scope.date_to = '';
	$scope.is_paid = '';
	$scope.is_active = 1;

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

		var params = {
			id: '',
			vendor_id: $scope.bill.vendor_id,
			// TODO: currency should be based on the customer selected
			currency: 'GBP',
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
		}, function(reason) {
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

	// copied from vendor.js
	$scope.emptyPostBill = function(id) {

		$scope.bill.id = id;
		$scope.bill.date_posted = format_todays_date();
		$scope.bill.date_due = format_todays_date();
		$scope.bill.posted_accumulatesplits = true;

		$('#billPostForm').modal('show');

	}

	// copied from vendor.js
	$scope.emptyPayBill = function(id) {

		$scope.bill.id = id;
		$scope.bill.date_paid = format_todays_date();

		$('#billPayForm').modal('show');

	}

	// copied from vendor.js - but removed vendor line
	$scope.emptyBill = function() {

		$scope.billTitle = 'Add bill';

		$scope.billNew = 1;

		$scope.bill.id = '';
		$scope.bill.date_opened = format_todays_date();
		$scope.bill.notes = '';

		$('#billForm').modal('show');

	}

	$scope.change();

}

function BillDetailCtrl($scope, $routeParams, Bill, Vendor, Account, Entry) {

	Vendor.query().then(function(vendors) {
		$scope.vendors = vendors;
	});

	Account.getBillAccountsForDropdown().then(function(accounts) {
		$scope.accounts = accounts;
	});

	Bill.get($routeParams.billId).then(function(bill) {
		$scope.bill = bill;
	});

	$scope.entry = {};
	$scope.entry.bill_account = {};

	$scope.entry.guid = '';
	$scope.entry.date = '';
	$scope.entry.description = '';
	$scope.entry.bill_account.guid = '';
	$scope.entry.quantity = '';
	$scope.entry.bill_price = '';
	$scope.entry.discount_type = '';
	$scope.entry.discount = '';

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
			vendor_id: $scope.bill.owner.id,
			currency: 'GBP',
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

	$scope.addEntry = function() {

		var params = {
			date: $scope.entry.date,
			description: $scope.entry.description,
			account_guid: $scope.entry.bill_account.guid,
			quantity: $scope.entry.quantity,
			price: $scope.entry.bill_price,
			discount_type: $scope.entry.discount_type,
			discount: $scope.entry.discount
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
			$scope.entry.discount_type = '';
			$scope.entry.discount = '';

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
		$scope.entry.date = format_todays_date(); // this should probably default to the bill date - not today's
		$scope.entry.description = '';
		$scope.entry.bill_account.guid = '';
		$scope.entry.quantity = '';
		$scope.entry.bill_price = '';
		$scope.entry.discount_type = 1;
		$scope.entry.discount = '';	

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
			discount_type: $scope.entry.discount_type,
			discount: $scope.entry.discount
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
			$scope.entry.discount_type = 1;
			$scope.entry.discount = '';

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