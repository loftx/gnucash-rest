function InvoiceListCtrl($scope, Invoice, Customer) {

	$scope.invoices = [];

	$scope.date_type = 'opened';
	$scope.date_from = Date.today().add(-3).months().toString('yyyy-MM-dd');
	$scope.date_to = '';
	$scope.is_paid = '';
	$scope.is_active = 1;

	var lastParams = {};

	$scope.invoice = {};
	$scope.invoice.id = '';
	$scope.invoice.customer_id = '';
	$scope.invoice.date_opened = '';
	$scope.invoice.notes = '';

	Customer.query().then(function(customers) {
		$scope.customers = customers;
	});

	$scope.$on('$viewContentLoaded', function() {
		$('#invoiceDateFrom').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});

		$('#invoiceDateTo').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});

		$('#invoiceDateOpened').datepicker({
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
			
			// Using $scope.invoices = Invoice.query(params); causes "$scope.invoices.push is not a function" - probably because it's a promise not an array...
			Invoice.query(params).then(function(invoices) {
				$scope.invoices = invoices;
			});

			lastParams = params;
		}
	}

	$scope.change();

	$scope.emptyInvoice = function() {

		$scope.invoiceTitle = 'Add invoice';

		$scope.invoiceNew = 1;

		$scope.invoice.id = '';
		$scope.invoice.date_opened = format_todays_date();
		$scope.invoice.notes = '';

		$('#invoiceForm').modal('show');

	}

	$scope.addInvoice = function() {

		var params = {
			id: '',
			customer_id: $scope.invoice.customer_id,
			// TODO: currency should be based on the customer selected
			currency: 'GBP',
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
		}, function(data) {

			// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
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

}

function InvoiceDetailCtrl($scope, $routeParams, Customer, Account, Invoice, Entry, Money) {

	Customer.query().then(function(customers) {
		$scope.customers = customers;
	});

	Account.getInvoiceAccountsForDropdown().then(function(accounts) {
		$scope.accounts = accounts;
	});

	Invoice.get($routeParams.invoiceId).then(function(invoice) {
		$scope.invoice = invoice;
	});

	$scope.entry = {};
	$scope.entry.inv_account = {};

	$scope.entry.guid = '';
	$scope.entry.date = '';
	$scope.entry.description = '';
	$scope.entry.inv_account.guid = '';
	$scope.entry.quantity = '';
	$scope.entry.inv_price = '';

	$scope.$on('$viewContentLoaded', function() {
		$('#entryDate').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});

		$('#invoiceDateOpened').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});
	});

	$scope.populateInvoice = function(id) {

		$scope.invoiceTitle = 'Edit invoice';
		$('#invoiceForm').modal('show');

	}

	$scope.saveInvoice = function() {

		var params = {
			id: $scope.invoice.id,
			customer_id: $scope.invoice.owner.id,
			currency: 'GBP',
			date_opened: $scope.invoice.date_opened,
			notes: $scope.invoice.notes
		};

		Invoice.save($scope.invoice.id, params).then(function(invoice) {
			
			$scope.invoice = invoice;

			$('#invoiceForm').modal('hide');
			$('#invoiceAlert').hide();

		}, function(data) {
			if(typeof data.errors != 'undefined') {
				$('#invoiceAlert').show();
				$scope.invoiceError = data.errors[0].message;
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
			account_guid: $scope.entry.inv_account.guid,
			quantity: $scope.entry.quantity,
			price: $scope.entry.inv_price,
			discount_type: $scope.entry.discount_type,
			discount: $scope.entry.discount
		};

		Entry.add($scope.invoice.id, params).then(function(entry) {
			
			$scope.invoice.entries.push(entry);

			$scope.invoice = Invoice.recalculate($scope.invoice);

			$('#entryForm').modal('hide');
			$('#entryAlert').hide();

			$scope.entry.guid = '';
			$scope.entry.date = '';
			$scope.entry.description = '';
			$scope.entry.inv_account.guid = '';
			$scope.entry.quantity = '';
			$scope.entry.inv_price = '';
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
		$scope.entry.date = format_todays_date(); // this should probably default to the invoice date - not today's
		$scope.entry.description = '';
		$scope.entry.inv_account.guid = '';
		$scope.entry.quantity = '';
		$scope.entry.inv_price = '';
		$scope.entry.discount_type = 1;
		$scope.entry.discount = '';

		$('#entryForm').modal('show');

	}

	$scope.deleteEntry = function(guid) {

		Entry.delete(guid).then(function() {
			for (var i = 0; i < $scope.invoice.entries.length; i++) {
				if ($scope.invoice.entries[i].guid == guid) {
					$scope.invoice.entries.splice(i, 1);
				}

				$scope.invoice = Invoice.recalculate($scope.invoice);
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
			account_guid: $scope.entry.inv_account.guid,
			quantity: $scope.entry.quantity,
			price: $scope.entry.inv_price,
			discount_type: $scope.entry.discount_type,
			discount: $scope.entry.discount
		};

		Entry.update(guid, params).then(function(entry) {
			
			for (var i = 0; i < $scope.invoice.entries.length; i++) {
				if ($scope.invoice.entries[i].guid == entry.guid) {
					$scope.invoice.entries[i] = entry;
				}
			}

			$scope.invoice = Invoice.recalculate($scope.invoice);
			
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