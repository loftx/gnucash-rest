function VendorListCtrl($scope, $uibModal, Vendor) {

	Vendor.query().then(function(vendors) {
		$scope.vendors = vendors;
	});

	$scope.orderProp = 'id';
	$scope.reverseProp = 'false';

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

	$scope.sortBy = function(orderProp) {
		$scope.reverseProp = ($scope.orderProp === orderProp) ? !$scope.reverseProp : false;
		$scope.orderProp = orderProp;
	}

	$scope.emptyVendor = function() {

		id = 0;

		var popup = $uibModal.open({
			templateUrl: 'partials/vendors/fragments/form.html',
			controller: 'modalEditVendorCtrl',
			size: 'lg',
			resolve: {
				id: function () { return id; }
			}
		});

		popup.result.then(function(vendor) {
			$scope.vendors.push(vendor);
		});

	}

	$scope.populateVendor = function(id) {

		var popup = $uibModal.open({
			templateUrl: 'partials/vendors/fragments/form.html',
			controller: 'modalEditVendorCtrl',
			size: 'lg',
			resolve: {
				id: function () { return id; }
			}
		});

		popup.result.then(function(vendor) {
			for (var i in $scope.vendors) {
				if ($scope.vendors[i].id == id) {
					$scope.vendors[i] = vendor;
				}
			}
		});

	}

}

function VendorDetailCtrl($scope, $uibModal, $routeParams, Vendor, Account, Bill, Dates) {

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

	$scope.orderProp = 'id';
	$scope.reverseProp = 'false';

	$scope.sortBy = function(orderProp) {
		$scope.reverseProp = ($scope.orderProp === orderProp) ? !$scope.reverseProp : false;
		$scope.orderProp = orderProp;
	}

	$scope.emptyPostBill = function(id) {

		$scope.bill = {};
		$scope.bill.id = id;
		$scope.bill.date_posted = Dates.format_todays_date();
		$scope.bill.date_due = Dates.format_todays_date();
		$scope.bill.posted_accumulatesplits = true;

        var popup = $uibModal.open({
            templateUrl: 'partials/bills/fragments/postform.html',
            controller: 'modalPostBillCtrl',
            size: 'lg',
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

	$scope.emptyUnpostBill = function(id) {

		$scope.bill = {};
		$scope.bill.id = id;

		var popup = $uibModal.open({
			templateUrl: 'partials/bills/fragments/unpostform.html',
			controller: 'modalUnpostBillCtrl',
			size: 'lg',
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

		$scope.bill = {};
		$scope.bill.id = id;
		$scope.bill.date_paid = Dates.todays_date();

		var popup = $uibModal.open({
			templateUrl: 'partials/bills/fragments/payform.html',
			controller: 'modalPayBillCtrl',
			size: 'lg',
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

		id = 0;

		var popup = $uibModal.open({
			templateUrl: 'partials/bills/fragments/form.html',
			controller: 'modalEditBillCtrl',
			size: 'lg',
			resolve: {
				id: function () { return id; },
				vendor_id: function () { return $scope.vendor.id; }
			}
		});

		popup.result.then(function(bill) {
			$scope.bills.push(bill);
		});

	}

}

// this is bad due to the case...
app.controller('modalEditVendorCtrl', ['id', '$scope', '$uibModalInstance', 'Vendor', 'Money', function(id, $scope, $uibModalInstance, Vendor, Money) {

	$scope.currencys = Money.currencys();

	$scope.vendorError = '';

	if (id == 0) {
		$scope.vendorTitle = 'Add vendor';
		$scope.vendorNew = 1;

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

	} else {
		Vendor.get(id).then(function(vendor) {
			$scope.vendorTitle = 'Edit vendor';
			$scope.vendorNew = 0;
			$scope.vendor = vendor;
		});
	}

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.saveVendor = function() {

		if ($scope.vendorNew == 1) {
			
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

				$scope.vendorError = '';
	 			$uibModalInstance.close(vendor);	

			}, function(data) {
				// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
				if(typeof data.errors != 'undefined') {
					$scope.vendorError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});

		} else {			

			var params = {
				id: id,
				name: $scope.vendor.name,
				contact: $scope.vendor.address.name,
				address_line_1: $scope.vendor.address.line_1,
				address_line_2: $scope.vendor.address.line_2,
				address_line_3: $scope.vendor.address.line_3,
				address_line_4: $scope.vendor.address.line_4,
				phone: $scope.vendor.address.phone,
				fax: $scope.vendor.address.fax,
				email: $scope.vendor.address.email
			};

			Vendor.update(id, params).then(function(vendor) {

				$scope.vendorError = '';
	 			$uibModalInstance.close(vendor);	

			}, function(data) {
				// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
				if(typeof data.errors != 'undefined') {
					$scope.vendorError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});

		}
	}

}]);