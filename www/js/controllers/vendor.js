function VendorListCtrl($scope, $http, $timeout) {

	$http.get('/api/vendors')
		.success(function(data) {
			$scope.vendors = data;
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

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

	$scope.addVendor = function() {

		var data = {
			id: '',
			currency: 'GBP',
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

		$http({
			method: 'POST',
			url: '/api/vendors',
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			$scope.vendors.push(data);
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
			
		}).error(function(data, status, headers, config) {
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

	/* $scope.populateCustomer = function(id) {

		$http.get('/api/customers/' + id).success(function(data) {
			$scope.customerTitle = 'Edit customer';
			$scope.customerNew = 0;
			$scope.customer = data;
			$('#customerForm').modal('show');
		});

	}

	$scope.updateCustomer = function(id) {

		var data = {
			id: id,
			name: $scope.customer.name,
			contact: $scope.customer.address.name,
			address_line_1: $scope.customer.address.line_1,
			address_line_2: $scope.customer.address.line_2,
			address_line_3: $scope.customer.address.line_3,
			address_line_4: $scope.customer.address.line_4,
			phone: $scope.customer.address.phone,
			fax: $scope.customer.address.fax,
			email: $scope.customer.address.email
		};

		$http({
			method: 'POST',
			url: '/api/customers/' + id,
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			for (var i = 0; i < $scope.customers.length; i++) {
				if ($scope.customers[i].id == data.id) {
					$scope.customers[i] = data;
				}
			}

			$('#customerForm').modal('hide');
			$('#customerAlert').hide();

			$scope.customer.id = '';
			$scope.customer.name = '';
			$scope.customer.address.name = '';
			$scope.customer.address.line_1 = '';
			$scope.customer.address.line_2 = '';
			$scope.customer.address.line_3 = '';
			$scope.customer.address.line_4 = '';
			$scope.customer.address.phone = '';
			$scope.customer.address.fax = '';
			$scope.customer.address.email = '';
			
		}).error(function(data, status, headers, config) {
			if(typeof data.errors != 'undefined') {
				$('#customerAlert').show();
				$scope.customerError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});
	} */

}

function VendorDetailCtrl($scope, $routeParams, $http, $timeout) {

	$http.get('/api/vendors/' + $routeParams.vendorId)
		.success(function(data) {
			$scope.vendor = data;
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	$http.get('/api/vendors/' + $routeParams.vendorId + '/bills?is_active=1')
		.success(function(data) {
			$scope.bills = data;
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	$http.get('/api/vendors')
		.success(function(data) {
			$scope.vendors = data;
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	$http.get('/api/accounts')
		.success(function(data) {
			var accounts = getSubAccounts($http, $timeout, data, 0);
			var billAccounts = [];

			// limit accounts to asset accounts and remove placeholder accounts 
			for (var i in accounts) {
				if (accounts[i].type_id == 12 && !accounts[i].placeholder) {
					billAccounts.push(accounts[i]);
				}
			}

			$scope.accounts = billAccounts;

			$scope.transferAccounts = [];

			// limit accounts to asset accounts and remove placeholder accounts 
			for (var i in accounts) {
				if (accounts[i].type_id == 2
					|| accounts[i].type_id == 1
					|| accounts[i].type_id == 0
					|| accounts[i].type_id == 4
					|| accounts[i].type_id == 3
				) {
				//if (accounts[i].type_id == 11 && !accounts[i].placeholder) {
					$scope.transferAccounts.push(accounts[i]);
				}
			}
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

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

		var data = {
			id: '',
			vendor_id: $scope.bill.vendor_id,
			currency: 'GBP',
			date_opened: $scope.bill.date_opened,
			notes: $scope.bill.notes
		};

		$http({
			method: 'POST',
			url: '/api/bills',
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			$scope.bills.push(data);
			$('#billForm').modal('hide');
			$('#billAlert').hide();

			$scope.bill.id = '';
			$scope.bill.vendor_id = '';
			$scope.bill.date_opened = '';
			$scope.bill.notes = '';
			
		}).error(function(data, status, headers, config) {
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
			//$scope.updateInvoice($scope.invoice.id);
		}
	}

	$scope.postBill = function(id) {

		$http.get('/api/bills/' + $scope.bill.id)
			.success(function(data) {

				var data = {
					vendor_id: data.owner.id,
					currency: data.currency,
					date_opened: data.date_opened,
					notes: data.notes,
					posted: 1,
					posted_account_guid: $scope.bill.posted_account,
					posted_date: $scope.bill.date_posted,
					due_date: $scope.bill.date_due,
					posted_memo: $scope.bill.posted_memo,
					posted_accumulatesplits: $scope.bill.posted_accumulatesplits, // this is True but should be 1
					posted_autopay: 0
				};

				$http({
					method: 'POST',
					url: '/api/bills/' + $scope.bill.id,
					transformRequest: function(obj) {
						var str = [];
						for(var p in obj)
						str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
						return str.join("&");
					},
					data: data,
					headers: {'Content-Type': 'application/x-www-form-urlencoded'}
				}).success(function(data) {

					$('#billPostForm').modal('hide');
					$('#billPostAlert').hide();

					$scope.bill = data;

					for (var i in $scope.bills) {
						if ($scope.bills[i].id == $scope.bill.id) {
							$scope.bills[i] = $scope.bill;
						}
					}
		
				}).error(function(data, status, headers, config) {
					if(typeof data.errors != 'undefined') {
						$('#billPostAlert').show();
						$scope.billError = data.errors[0].message;
					} else {
						console.log(data);
						console.log(status);	
					}
				});
		
			})
			.error(function(data, status) {
				handleApiErrors($timeout, data, status);
			})
		;	

	}

	$scope.payBill = function(id) {
			
		var data = {
			posted_account_guid: $scope.bill.post_account,
			transfer_account_guid: $scope.bill.transfer_account,
			payment_date: $scope.bill.date_paid,
			num: '',
			memo: '',
			auto_pay: 0,
		};

		$http({
			method: 'PAY',
			url: '/api/bills/' + $scope.bill.id,
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			$('#billPayForm').modal('hide');
			$('#billPayAlert').hide();

			$scope.bill = data;

			for (var i in $scope.bills) {
				if ($scope.bills[i].id == $scope.bill.id) {
					$scope.bills[i] = $scope.bill;
				}
			}
			
		}).error(function(data, status, headers, config) {
			if(typeof data.errors != 'undefined') {
				$('#billPayAlert').show();
				$scope.billError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});	

	}

	$scope.emptyPostBill = function(id) {

		$scope.bill.id = id;
		$scope.bill.date_posted = format_todays_date();
		$scope.bill.date_due = format_todays_date();
		$scope.bill.posted_accumulatesplits = true;

		$('#billPostForm').modal('show');

	}

	$scope.emptyPayBill = function(id) {

		$scope.bill.id = id;
		$scope.bill.date_paid = format_todays_date();

		$('#billPayForm').modal('show');

	}

	$scope.emptyBill = function() {

		$scope.billTitle = 'Add bill';

		$scope.billNew = 1;

		$scope.bill.id = '';
		$scope.bill.vendor_id = $scope.vendor.id;
		$scope.bill.date_opened = format_todays_date();
		$scope.bill.notes = '';

		$('#billForm').modal('show');

	}

	/* $scope.populateCustomer = function(id) {

		$http.get('/api/customers/' + id).success(function(data) {
			$scope.customerTitle = 'Edit customer';
			$scope.customerNew = 0;
			$scope.customer = data;
			$('#customerForm').modal('show');
		});

	}

	$scope.updateCustomer = function(id) {

		var data = {
			id: id,
			name: $scope.customer.name,
			contact: $scope.customer.address.name,
			address_line_1: $scope.customer.address.line_1,
			address_line_2: $scope.customer.address.line_2,
			address_line_3: $scope.customer.address.line_3,
			address_line_4: $scope.customer.address.line_4,
			phone: $scope.customer.address.phone,
			fax: $scope.customer.address.fax,
			email: $scope.customer.address.email
		};

		$http({
			method: 'POST',
			url: '/api/customers/' + id,
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			for (var i = 0; i < $scope.customers.length; i++) {
				if ($scope.customers[i].id == data.id) {
					$scope.customers[i] = data;
				}
			}

			$('#customerForm').modal('hide');
			$('#customerAlert').hide();

			$scope.customer.id = '';
			$scope.customer.name = '';
			$scope.customer.address.name = '';
			$scope.customer.address.line_1 = '';
			$scope.customer.address.line_2 = '';
			$scope.customer.address.line_3 = '';
			$scope.customer.address.line_4 = '';
			$scope.customer.address.phone = '';
			$scope.customer.address.fax = '';
			$scope.customer.address.email = '';
			
		}).error(function(data, status, headers, config) {
			if(typeof data.errors != 'undefined') {
				$('#customerAlert').show();
				$scope.customerError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});
	} */

}