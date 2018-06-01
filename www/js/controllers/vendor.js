function VendorListCtrl($scope, Vendor, Money, Dates) {

	Vendor.query().then(function(vendors) {
		$scope.vendors = vendors;
	});

	$scope.orderProp = "id";

	$scope.vendor = {};
	$scope.vendor.id = '';
	$scope.vendor.name = '';
	$scope.vendor.address = {};
	$scope.vendor.address.name = '';
	$scope.vendor.address.line_1 = '';
	$scope.vendor.address.line_2 = '';
	$scope.vendor.address.line_3 = '';
	$scope.vendor.address.line_4 = '';
	$scope.vendor.address.phone = '';
	$scope.vendor.address.fax = '';
	$scope.vendor.address.email = '';

	$scope.currencys = Money.currencys();

	$scope.addVendor = function() {

		var params = {
			id: '',
			currency: $scope.vendor.currency,
			name: $scope.vendor.name,
			contact: $scope.vendor.address.name,
			address_line_1: $scope.vendor.address.line_1,
			address_line_2: $scope.vendor.address.line_3,
			address_line_3: $scope.vendor.address.line_3,
			address_line_4: $scope.vendor.address.line_4,
			phone: $scope.vendor.address.phone,
			fax: $scope.vendor.address.fax,
			email: $scope.vendor.address.email
		};

		Vendor.add(params).then(function(vendor) {
			$scope.vendors.push(vendor);
			$('#vendorForm').modal('hide');
			$('#vendorAlert').hide();

			$scope.vendor.id = '';
			$scope.vendor.name = '';
			$scope.vendor.address.name = '';
			$scope.vendor.address.line_1 = '';
			$scope.vendor.address.line_2 = '';
			$scope.vendor.address.line_3 = '';
			$scope.vendor.address.line_4 = '';
			$scope.vendor.address.phone = '';
			$scope.vendor.address.fax = '';
			$scope.vendor.address.email = '';

		}, function(data) {
			// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
			if(typeof data.errors != 'undefined') {
				$('#vendorAlert').show();
				$scope.vendorError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});
	}

	$scope.saveVendor = function() {
		if ($scope.vendorNew == 1) {
			$scope.addVendor();
		} else {
			// This may fail as it's possible to update the ID
			//$scope.updateVendor($scope.vendir.id);
		}
	}

	$scope.emptyVendor = function() {

		$scope.vendorTitle = 'Add vendor';

		$scope.vendorNew = 1;

		$scope.vendor.id = '';
		$scope.vendor.name = '';
		$scope.vendor.address.name = '';
		$scope.vendor.address.line_1 = '';
		$scope.vendor.address.line_2 = '';
		$scope.vendor.address.line_3 = '';
		$scope.vendor.address.line_4 = '';
		$scope.vendor.address.phone = '';
		$scope.vendor.address.fax = '';
		$scope.vendor.address.email = '';

		$('#vendorForm').modal('show');

	}

}

function VendorDetailCtrl($scope, $routeParams, $uibModal, Vendor, Bill, Account, Dates) {

	Vendor.get($routeParams.vendorId).then(function(vendor) {
		$scope.vendor = vendor;
	});

	Vendor.getBills($routeParams.vendorId).then(function(bills) {
		$scope.bills = bills;
	});

	Vendor.query().then(function(vendors) {
		$scope.vendors = vendors;
	});

	Account.getAccountsOfTypesForDropdown([ACCT_TYPE_PAYABLE]).then(function(accounts) {
		$scope.accounts = accounts;
	});

	Account.getAccountsOfTypesForDropdown([ACCT_TYPE_ASSET, ACCT_TYPE_CASH, ACCT_TYPE_BANK, ACCT_TYPE_LIABILITY, ACCT_TYPE_CREDIT]).then(function(transferAccounts) {
		$scope.transferAccounts = transferAccounts;
	});

	$scope.orderProp = "id";

	$scope.bill = {};
	$scope.bill.id = '';
	$scope.bill.vendor_id = '';
	$scope.bill.date_opened = '';
	$scope.bill.notes = '';

	$scope.$on('$viewContentLoaded', function() {
		$('#billDateOpened').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});

		$('#billDatePosted').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});

		$('#billDateDue').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});

		$('#billDatePaid').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});
	});

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

	$scope.saveBill = function() {
		if ($scope.billNew == 1) {
			$scope.addBill();
		} else {
			// This may fail as it's possible to update the ID
			//$scope.updateBill($scope.bill.id);
		}
	}

	$scope.postBill = function(id) {

		Bill.get($scope.bill.id).then(function(bill) {
			
			var params = {
				vendor_id: bill.owner.id,
				currency: bill.currency,
				date_opened: bill.date_opened,
				notes: bill.notes,
				posted: 1,
				posted_account_guid: $scope.bill.posted_account,
				posted_date: $scope.bill.date_posted,
				due_date: $scope.bill.date_due,
				posted_memo: $scope.bill.posted_memo,
				posted_accumulatesplits: $scope.bill.posted_accumulatesplits, // this is True but should be 1
				posted_autopay: 0
			};

			Bill.update($scope.bill.id, params).then(function(bill) {
			
				$('#billPostForm').modal('hide');
				$('#billPostAlert').hide();

				$scope.bill = bill;

				for (var i in $scope.bills) {
					if ($scope.bills[i].id == $scope.bill.id) {
						$scope.bills[i] = $scope.bill;
					}
				}

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
			for (var i in $scope.bills) {
				if ($scope.bills[i].id == $scope.bill.id) {
					$scope.bills[i] = bill;
				}
			}
		});

	}



	$scope.emptyBill = function() {

		$scope.billTitle = 'Add bill';

		$scope.billNew = 1;

		$scope.bill.id = '';
		$scope.bill.vendor_id = $scope.vendor.id;
		$scope.bill.date_opened = Dates.format_todays_date();
		$scope.bill.notes = '';

		$('#billForm').modal('show');

	}

}