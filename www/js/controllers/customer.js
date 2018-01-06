function CustomerListCtrl($scope, $http, $timeout) {
	
	$http.get('/api/customers')
		.success(function(data) {
			$scope.customers = data;
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	$scope.orderProp = "id";

	$scope.customer = {};
	$scope.customer.id = '';
	$scope.customer.name = '';
	$scope.customer.address = {};
	$scope.customer.address.name = '';
	$scope.customer.address.line_1 = '';
	$scope.customer.address.line_2 = '';
	$scope.customer.address.line_3 = '';
	$scope.customer.address.line_4 = '';
	$scope.customer.address.phone = '';
	$scope.customer.address.fax = '';
	$scope.customer.address.email = '';

	$scope.addCustomer = function() {

		var data = {
			id: '',
			currency: 'GBP',
			name: $scope.customer.name,
			contact: $scope.customer.address.name,
			address_line_1: $scope.customer.address.line_1,
			address_line_2: $scope.customer.address.line_3,
			address_line_3: $scope.customer.address.line_3,
			address_line_4: $scope.customer.address.line_4,
			phone: $scope.customer.address.phone,
			fax: $scope.customer.address.fax,
			email: $scope.customer.address.email
		};

		$http({
			method: 'POST',
			url: '/api/customers',
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			$scope.customers.push(data);
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
	}

	$scope.saveCustomer = function() {
		if ($scope.customerNew == 1) {
			$scope.addCustomer();
		} else {
			// This may fail as it's possible to update the ID
			$scope.updateCustomer($scope.customer.id);
		}
	}

	$scope.emptyCustomer = function() {

		$scope.customerTitle = 'Add customer';

		$scope.customerNew = 1;

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

		$('#customerForm').modal('show');

	}

	$scope.populateCustomer = function(id) {

		$http.get('/api/customers/' + id)
			.success(function(data) {
				$scope.customerTitle = 'Edit customer';
				$scope.customerNew = 0;
				$scope.customer = data;
				$('#customerForm').modal('show');
			})
			.error(function(data, status) {
				handleApiErrors($timeout, data, status);
			})
		;

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
	}
}

function CustomerDetailCtrl($scope, $routeParams, $http, $timeout) {
	$http.get('/api/customers/' + $routeParams.customerId)
		.success(function(data) {
			$scope.customer = data;
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	$http.get('/api/customers/' + $routeParams.customerId + '/invoices')
		.success(function(data) {
			$scope.invoices = data;
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	$http.get('/api/customers')
		.success(function(data) {
			$scope.customers = data;
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	$http.get('/api/accounts')
		.success(function(data) {
			var accounts = getSubAccounts($http, $timeout, data, 0);
			var invoiceAccounts = [];

			// limit accounts to asset accounts and remove placeholder accounts 
			for (var i in accounts) {
				if (accounts[i].type_id == 11 && !accounts[i].placeholder) {
					invoiceAccounts.push(accounts[i]);
				}
			}

			$scope.accounts = invoiceAccounts;

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
					//console.log(accounts[i].type_id + ' ' + accounts[i].name)
					$scope.transferAccounts.push(accounts[i]);
				}
			}
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	$scope.orderProp = "id";

	$scope.invoice = {};
	$scope.invoice.id = '';
	$scope.invoice.customer_id = '';
	$scope.invoice.date_opened = '';
	$scope.invoice.notes = '';

	$scope.$on('$viewContentLoaded', function() {
		$('#invoiceDateOpened').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});

		$('#invoiceDatePosted').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});

		$('#invoiceDateDue').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});

		$('#invoiceDatePaid').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});
	});

	$scope.addInvoice = function() {

		var data = {
			id: '',
			customer_id: $scope.invoice.customer_id,
			currency: 'GBP',
			date_opened: $scope.invoice.date_opened,
			notes: $scope.invoice.notes
		};

		$http({
			method: 'POST',
			url: '/api/invoices',
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			$scope.invoices.push(data);
			$('#invoiceForm').modal('hide');
			$('#invoiceAlert').hide();

			$scope.invoice.id = '';
			$scope.invoice.customer_id = '';
			$scope.invoice.date_opened = '';
			$scope.invoice.notes = '';
			
		}).error(function(data, status, headers, config) {
			if(typeof data.errors != 'undefined') {
				$('#invoiceAlert').show();
				$scope.invoiceError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});
	}

	$scope.saveInvoice = function() {
		if ($scope.invoiceNew == 1) {
			$scope.addInvoice();
		} else {
			// This may fail as it's possible to update the ID
			//$scope.updateInvoice($scope.invoice.id);
		}
	}

	$scope.postInvoice = function(id) {

		$http.get('/api/invoices/' + $scope.invoice.id)
			.success(function(data) {

				var data = {
					customer_id: data.owner.id,
					currency: data.currency,
					date_opened: data.date_opened,
					notes: data.notes,
					posted: 1,
					posted_account_guid: $scope.invoice.posted_account,
					posted_date: $scope.invoice.date_posted,
					due_date: $scope.invoice.date_due,
					posted_memo: $scope.invoice.posted_memo,
					posted_accumulatesplits: $scope.invoice.posted_accumulatesplits, // this is True but should be 1
					posted_autopay: 0
				};

				$http({
					method: 'POST',
					url: '/api/invoices/' + $scope.invoice.id,
					transformRequest: function(obj) {
						var str = [];
						for(var p in obj)
						str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
						return str.join("&");
					},
					data: data,
					headers: {'Content-Type': 'application/x-www-form-urlencoded'}
				}).success(function(data) {

					$('#invoicePostForm').modal('hide');
					$('#invoicePostAlert').hide();

					$scope.invoice = data;
				
					for (var i in $scope.invoices) {
						if ($scope.invoices[i].id == $scope.invoice.id) {
							$scope.invoices[i] = $scope.invoice;
						}
					}
					
				}).error(function(data, status, headers, config) {
					if(typeof data.errors != 'undefined') {
						$('#invoicePostAlert').show();
						$scope.invoiceError = data.errors[0].message;
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

	$scope.payInvoice = function(id) {

		var data = {
			posted_account_guid: $scope.invoice.post_account,
			transfer_account_guid: $scope.invoice.transfer_account,
			payment_date: $scope.invoice.date_paid,
			num: '',
			memo: '',
			auto_pay: 0,
		};

		$http({
			method: 'PAY',
			url: '/api/invoices/' + $scope.invoice.id,
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			$('#invoicePayForm').modal('hide');
			$('#invoicePayAlert').hide();

			$scope.invoice = data;
			
			for (var i in $scope.invoices) {
				if ($scope.invoices[i].id == $scope.invoice.id) {
					$scope.invoices[i] = $scope.invoice;
				}
			}
			
		}).error(function(data, status, headers, config) {
			if(typeof data.errors != 'undefined') {
				$('#invoicePayAlert').show();
				$scope.invoiceError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});

	}

	$scope.emptyPostInvoice = function(id) {

		$scope.invoice.id = id;
		$scope.invoice.date_posted = format_todays_date();
		$scope.invoice.date_due = format_todays_date();
		$scope.invoice.posted_accumulatesplits = true;

		$('#invoicePostForm').modal('show');

	}

	$scope.emptyPayInvoice = function(id) {

		$scope.invoice.id = id;
		$scope.invoice.date_paid = format_todays_date();
		//$scope.invoice.date_due = format_todays_date();
		//$scope.invoice.posted_accumulatesplits = true;

		$('#invoicePayForm').modal('show');

	}

	$scope.emptyInvoice = function() {

		$scope.invoiceTitle = 'Add invoice';

		$scope.invoiceNew = 1;

		$scope.invoice.id = '';
		$scope.invoice.customer_id = $scope.customer.id;
		$scope.invoice.date_opened = format_todays_date();
		$scope.invoice.notes = '';

		$('#invoiceForm').modal('show');

	}

	$scope.populateCustomer = function(id) {

		$http.get('/api/customers/' + id)
			.success(function(data) {
				$scope.customerTitle = 'Edit customer';
				$scope.customerNew = 0;
				$scope.customer = data;
				$('#customerForm').modal('show');
			})
			.error(function(data, status) {
				handleApiErrors($timeout, data, status);
			})
		;

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
	}

}