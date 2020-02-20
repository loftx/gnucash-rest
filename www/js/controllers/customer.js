function CustomerListCtrl($scope, $uibModal, Customer) {
	
	Customer.query().then(function(customers) {
		$scope.customers = customers;
	});

	$scope.orderProp = 'id';
	$scope.reverseProp = 'false';

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

	$scope.sortBy = function(orderProp) {
		$scope.reverseProp = ($scope.orderProp === orderProp) ? !$scope.reverseProp : false;
		$scope.orderProp = orderProp;
	}

	$scope.emptyCustomer = function() {

		id = 0;

		var popup = $uibModal.open({
			templateUrl: 'partials/customers/fragments/form.html',
			controller: 'modalEditCustomerCtrl',
			size: 'sm',
			resolve: {
				id: function () { return id; }
			}
		});

		popup.result.then(function(customer) {
			$scope.customers.push(customer);
		});

	}

	$scope.populateCustomer = function(id) {

		var popup = $uibModal.open({
			templateUrl: 'partials/customers/fragments/form.html',
			controller: 'modalEditCustomerCtrl',
			size: 'sm',
			resolve: {
				id: function () { return id; }
			}
		});

		popup.result.then(function(customer) {
			for (var i in $scope.customers) {
				if ($scope.customers[i].id == id) {
					$scope.customers[i] = customer;
				}
			}
		});

	}

}

function CustomerDetailCtrl($scope, $uibModal, $routeParams, Customer, Account, Invoice, Dates) {

	Customer.get($routeParams.customerId).then(function(customer) {
		$scope.customer = customer;
	});
	
	Customer.getInvoices($routeParams.customerId).then(function(invoices) {
		$scope.invoices = invoices;
	});

	Customer.query().then(function(customers) {
		$scope.customers = customers;
	});

	Account.getAccountsOfTypesForDropdown([ACCT_TYPE_RECEIVABLE]).then(function(accounts) {
		$scope.accounts = accounts;
	});

	Account.getAccountsOfTypesForDropdown([ACCT_TYPE_ASSET, ACCT_TYPE_CASH, ACCT_TYPE_BANK, ACCT_TYPE_LIABILITY, ACCT_TYPE_CREDIT]).then(function(transferAccounts) {
		$scope.transferAccounts = transferAccounts;
	});

	$scope.orderProp = 'id';
	$scope.reverseProp = 'false';

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

	$scope.sortBy = function(orderProp) {
		$scope.reverseProp = ($scope.orderProp === orderProp) ? !$scope.reverseProp : false;
		$scope.orderProp = orderProp;
	}

	$scope.addInvoice = function() {

		for (var i = 0; i < $scope.customers.length; i++) {
			if ($scope.customers[i].id == $scope.invoice.customer_id) {
				$scope.invoice.customer_currency = $scope.customers[i].currency;
			}
		}

		var params = {
			id: '',
			customer_id: $scope.invoice.customer_id,
			currency: $scope.invoice.customer_currency,
			date_opened: $scope.invoice.date_opened,
			notes: $scope.invoice.notes
		};

		Invoice.add(params).then(function(invoice) {
			$scope.invoices.push(invoice);
			$('#invoiceForm').modal('hide');
			$('#invoiceAlert').hide();

			$scope.invoice.id = '';
			$scope.invoice.customer_id = '';
			$scope.invoice.date_opened = '';
			$scope.invoice.notes = '';
		}, function(reason) {
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

		Invoice.get($scope.invoice.id).then(function(invoice) {
			
			var params = {
				customer_id: invoice.owner.id,
				currency: invoice.currency,
				date_opened: invoice.date_opened,
				notes: invoice.notes,
				posted: 1,
				posted_account_guid: $scope.invoice.posted_account,
				posted_date: $scope.invoice.date_posted,
				due_date: $scope.invoice.date_due,
				posted_memo: $scope.invoice.posted_memo,
				posted_accumulatesplits: $scope.invoice.posted_accumulatesplits, // this is True but should be 1
				posted_autopay: 0
			};

			Invoice.update($scope.invoice.id, params).then(function(invoice) {
			
				$('#invoicePostForm').modal('hide');
				$('#invoicePostAlert').hide();

				$scope.invoice = invoice;
			
				for (var i in $scope.invoices) {
					if ($scope.invoices[i].id == $scope.invoice.id) {
						$scope.invoices[i] = $scope.invoice;
					}
				}

			}, function(data) {
				if(typeof data.errors != 'undefined') {
					$('#invoicePostAlert').show();
					$scope.invoiceError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});

		});

	}

	$scope.unpostInvoice = function(id) {

		Invoice.get($scope.invoice.id).then(function(invoice) {
			
			var params = {
				reset_tax_tables: $scope.invoice.reset_tax_tables,
			};

			Invoice.unpost($scope.invoice.id, params).then(function(invoice) {
			
				$('#invoiceUnpostForm').modal('hide');
				$('#invoiceUnpostAlert').hide();

				$scope.invoice = invoice;
			
				for (var i in $scope.invoices) {
					if ($scope.invoices[i].id == $scope.invoice.id) {
						$scope.invoices[i] = $scope.invoice;
					}
				}

			}, function(data) {
				if(typeof data.errors != 'undefined') {
					$('#invoiceUnpostAlert').show();
					$scope.invoiceError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});

		});

	}

	// id is unused here as it's undefined when passed though
	$scope.payInvoice = function(id) {

		var params = {
			posted_account_guid: $scope.invoice.post_account,
			transfer_account_guid: $scope.invoice.transfer_account,
			payment_date: $scope.invoice.date_paid,
			num: '',
			memo: '',
			auto_pay: 0,
		};

		Invoice.pay($scope.invoice.id, params).then(function(invoice) {
			
			$('#invoicePayForm').modal('hide');
			$('#invoicePayAlert').hide();

			$scope.invoice = invoice;

			for (var i in $scope.invoices) {
				if ($scope.invoices[i].id == $scope.invoice.id) {
					$scope.invoices[i] = $scope.invoice;
				}
			}

		}, function(data) {
			if(typeof data.errors != 'undefined') {
				$('#invoicePayAlert').show();
				$scope.invoiceError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});

	}

	// duplicate of invoice.js
	$scope.emptyPostInvoice = function(id) {

		$scope.invoice.id = id;
		$scope.invoice.date_posted = Dates.format_todays_date();
		$scope.invoice.date_due = Dates.format_todays_date();
		$scope.invoice.posted_accumulatesplits = true;

		var popup = $uibModal.open({
			templateUrl: 'partials/invoices/fragments/postform.html',
			controller: 'modalPostInvoiceCtrl',
			size: 'sm',
			resolve: {
				invoice: function () {
					return $scope.invoice;
				}
			}
		});

		popup.result.then(function(invoice) {
			for (var i in $scope.invoices) {
				if ($scope.invoices[i].id == $scope.invoice.id) {
					$scope.invoices[i] = invoice;
				}
			}
		});

	}

	$scope.emptyUnpostInvoice = function(id) {

		$scope.invoice.id = id;

		var popup = $uibModal.open({
			templateUrl: 'partials/invoices/fragments/unpostform.html',
			controller: 'modalUnpostInvoiceCtrl',
			size: 'sm',
			resolve: {
				invoice: function () {
					return $scope.invoice;
				}
			}
		});

		popup.result.then(function(invoice) {
			for (var i in $scope.invoices) {
				if ($scope.invoices[i].id == $scope.invoice.id) {
					$scope.invoices[i] = invoice;
				}
			}
		});

	}

	$scope.emptyPayInvoice = function(id) {

		$scope.invoice.id = id;
		$scope.invoice.date_paid = Dates.format_todays_date();

		var popup = $uibModal.open({
			templateUrl: 'partials/invoices/fragments/payform.html',
			controller: 'modalPayInvoiceCtrl',
			size: 'sm',
			resolve: {
				invoice: function () {
				  return $scope.invoice;
				}
			}
		});

		popup.result.then(function(invoice) {
			for (var i in $scope.invoices) {
				if ($scope.invoices[i].id == $scope.invoice.id) {
					$scope.invoices[i] = invoice;
				}
			}
		});

	}

	$scope.emptyInvoice = function() {

		$scope.invoiceTitle = 'Add invoice';

		$scope.invoiceNew = 1;

		$scope.invoice.id = '';
		$scope.invoice.customer_id = $scope.customer.id;
		$scope.invoice.date_opened = Dates.format_todays_date();
		$scope.invoice.notes = '';

		$('#invoiceForm').modal('show');

	}

	$scope.populateCustomer = function(id) {

		Customer.get(id).then(function(customer) {
			$scope.customerTitle = 'Edit customer';
			$scope.customerNew = 0;
			$scope.customer = customer;
			$('#customerForm').modal('show');
		});

	}

	$scope.updateCustomer = function(id) {

		var params = {
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

		Customer.update(id, params).then(function(customer) {
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

		}, function(data) {
			// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
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

// this is bad due to the case...
//app.controller('modalEditCustomerCtrl', ['customer', '$scope', '$uibModalInstance', 'Customer', 'Money', function(customer, $scope, $uibModalInstance, Customer, Money) {
app.controller('modalEditCustomerCtrl', ['id', '$scope', '$uibModalInstance', 'Customer', 'Money', function(id, $scope, $uibModalInstance, Customer, Money) {

	$scope.currencys = Money.currencys();
	//$scope.customer = customer;

	if (id == 0) {
		$scope.customerTitle = 'Add customer';
		$scope.customerNew = 1;

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

	} else {
		Customer.get(id).then(function(customer) {
			$scope.customerTitle = 'Edit customer';
			$scope.customerNew = 0;
			$scope.customer = customer;
		});
	}

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.saveCustomer = function() {

		if ($scope.customerNew == 1) {
			
			var params = {
				id: '',
				currency: $scope.customer.currency,
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

			Customer.add(params).then(function(customer) {

				$('#customerAlert').hide();
	 			$uibModalInstance.close(customer);	

			}, function(data) {
				// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
				if(typeof data.errors != 'undefined') {
					$('#customerAlert').show();
					$scope.customerError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});

		} else {			

			var params = {
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

			Customer.update(id, params).then(function(customer) {

				$('#customerAlert').hide();
	 			$uibModalInstance.close(customer);	

			}, function(data) {
				// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
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

}]);