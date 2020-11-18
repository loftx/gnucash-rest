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
			size: 'lg',
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
			size: 'lg',
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

	$scope.sortBy = function(orderProp) {
		$scope.reverseProp = ($scope.orderProp === orderProp) ? !$scope.reverseProp : false;
		$scope.orderProp = orderProp;
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
			size: 'lg',
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
			size: 'lg',
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
			size: 'lg',
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

		id = 0;

		var popup = $uibModal.open({
			templateUrl: 'partials/invoices/fragments/form.html',
			controller: 'modalEditInvoiceCtrl',
			size: 'lg',
			resolve: {
				id: function () { return id; },
				customer_id: function () { return $scope.customer.id; }
			}
		});

		popup.result.then(function(invoice) {
			$scope.invoices.push(invoice);
		});

	}

}

// this is bad due to the case...
app.controller('modalEditCustomerCtrl', ['id', '$scope', '$uibModalInstance', 'Customer', 'Money', function(id, $scope, $uibModalInstance, Customer, Money) {

	$scope.currencys = Money.currencys();

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