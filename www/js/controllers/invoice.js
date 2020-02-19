function InvoiceListCtrl($scope, $uibModal, Invoice, Customer, Account, Dates) {

	$scope.invoices = [];

	$scope.orderProp = 'id';
	$scope.reverseProp = 'false';
	$scope.date_type = 'opened';
	$scope.date_from = Date.today().add(-3).months().toString('yyyy-MM-dd');
	$scope.date_to = '';
	$scope.is_paid = '';
	$scope.is_posted = '';
	$scope.is_active = '1'; // needs to be a string or isn't picked up by Angular...

	$scope.invoice = {};
	$scope.invoice.id = '';
	$scope.invoice.customer_id = '';
	$scope.invoice.date_opened = '';
	$scope.invoice.notes = '';

	var lastParams = {};

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

	$scope.sortBy = function(orderProp) {
		$scope.reverseProp = ($scope.orderProp === orderProp) ? !$scope.reverseProp : false;
		$scope.orderProp = orderProp;
	}

	$scope.change = function() {

		var params = {
			'date_from': $scope.date_from,
			'date_to': $scope.date_to,
			'date_type': $scope.date_type,
			'is_posted': $scope.is_posted,
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
		$scope.invoice.date_opened = Dates.format_todays_date();
		$scope.invoice.notes = '';

		$('#invoiceForm').modal('show');

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

function InvoiceDetailCtrl($scope, $routeParams, Customer, Account, Invoice, Entry, Money, Dates) {

	Customer.query().then(function(customers) {
		$scope.customers = customers;
	});

	Account.getInvoiceAccountsForDropdown().then(function(accounts) {
		$scope.accounts = accounts;
	});

	Invoice.get($routeParams.invoiceId).then(function(invoice) {
		$scope.invoice = invoice;
		// used to set customer on edit form
		$scope.invoice.customer_id = $scope.invoice.owner.id;
	});

	$scope.entry = {};
	$scope.entry.inv_account = {};

	$scope.entry.guid = '';
	$scope.entry.date = '';
	$scope.entry.description = '';
	$scope.entry.inv_account.guid = '';
	$scope.entry.quantity = '';
	$scope.entry.inv_price = '';
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
			active: $scope.invoice.active,
			customer_id: $scope.invoice.owner.id,
			currency: $scope.invoice.currency,
			date_opened: $scope.invoice.date_opened,
			notes: $scope.invoice.notes
		};

		Invoice.update($scope.invoice.id, params).then(function(invoice) {
			
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
			discount: (($scope.entry.discount == '') ? 0 : $scope.entry.discount) // allow discount to be left blank for easy entry
		};

		Entry.add('invoice', $scope.invoice.id, params).then(function(entry) {
			
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

		$scope.discount_types = [{
			key: 1, value: '£'
		}];

		$scope.entry.guid = '';
		$scope.entry.date = Dates.format_todays_date(); // this should probably default to the invoice date - not today's
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

// this is bad due to the case...
app.controller('modalPostInvoiceCtrl', ['invoice', '$scope', '$uibModalInstance', 'Account', 'Invoice', 'Dates', function(invoice, $scope, $uibModalInstance, Account, Invoice, Dates) {

	$scope.invoice = {}
	$scope.invoice.date_posted = Dates.todays_date();
	$scope.invoice.date_due = Dates.todays_date();
	$scope.invoice.posted_accumulatesplits = true;

	$scope.picker = {
		invoiceDatePosted: { opened: false },
		invoiceDateDue: { opened: false },
		open: function(field) { $scope.picker[field].opened = true; },
		options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
	};

	Account.getAccountsOfTypesForDropdown([ACCT_TYPE_RECEIVABLE]).then(function(accounts) {
		$scope.accounts = accounts;
		// fill in default posting account
		$scope.invoice.posted_account = accounts[0].guid;
	});

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	// all these functions are identical to those in customer.js - CustomerDetailCtrl
	$scope.postInvoice = function(id) {

		Invoice.get(invoice.id).then(function(invoice) {
			
			var params = {
				customer_id: invoice.owner.id,
				currency: invoice.currency,
				date_opened: invoice.date_opened,
				notes: invoice.notes,
				posted: 1,
				posted_account_guid: $scope.invoice.posted_account,
				posted_date: Dates.dateInput($scope.invoice.date_posted),
				due_date: Dates.dateInput($scope.invoice.date_due),
				posted_memo: $scope.invoice.posted_memo,
				posted_accumulatesplits: $scope.invoice.posted_accumulatesplits, // this is True but should be 1
				posted_autopay: 0
			};

			Invoice.update(invoice.id, params).then(function(invoice) {
			
				$('#invoicePostAlert').hide();
				$uibModalInstance.close(invoice);	

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

}]);

// do we need all these bits
app.controller('modalUnpostInvoiceCtrl', ['invoice', '$scope', '$uibModalInstance', 'Invoice', function(invoice, $scope, $uibModalInstance, Invoice) {

	$scope.invoice = {};
	$scope.invoice.reset_tax_tables = true;

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.unpostInvoice = function(id) {

		Invoice.get(invoice.id).then(function(invoice) {
			
			var params = {
				reset_tax_tables: $scope.invoice.reset_tax_tables,
			};

			Invoice.unpost(invoice.id, params).then(function(invoice) {
			
				$('#invoicePostAlert').hide();
				$uibModalInstance.close(invoice);	

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

}]);

app.controller('modalPayInvoiceCtrl', ['invoice', '$scope', '$uibModalInstance', 'Account', 'Invoice', 'Dates', function(invoice, $scope, $uibModalInstance, Account, Invoice, Dates) {

	$scope.invoice = invoice;

	$scope.picker = {
		invoiceDatePaid: { opened: false },
		invoiceDateDue: { opened: false },
		open: function(field) { $scope.picker[field].opened = true; },
		options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
	};
	
	Account.getAccountsOfTypesForDropdown([ACCT_TYPE_RECEIVABLE]).then(function(accounts) {
		$scope.accounts = accounts;
		// fill in default posting account
		$scope.invoice.post_account = accounts[0].guid;
	});

	Account.getAccountsOfTypesForDropdown([ACCT_TYPE_ASSET, ACCT_TYPE_CASH, ACCT_TYPE_BANK, ACCT_TYPE_LIABILITY, ACCT_TYPE_CREDIT]).then(function(transferAccounts) {
		$scope.transferAccounts = transferAccounts;
	});

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.payInvoice = function() {
			
		var params = {
			posted_account_guid: invoice.post_account,
			transfer_account_guid: invoice.transfer_account,
			payment_date: Dates.dateInput(invoice.date_paid),
			num: '',
			memo: '',
			auto_pay: 0,
		};

		Invoice.pay(invoice.id, params).then(function(invoice) {
			
			$('#invoicePostAlert').hide();
			$uibModalInstance.close(invoice);	

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
	
}]);