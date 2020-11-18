function InvoiceListCtrl($scope, $uibModal, Invoice, Customer, Account, Dates) {

	$scope.invoices = [];

	$scope.orderProp = 'id';
	$scope.reverseProp = 'false';
	$scope.date_type = 'opened';
	$scope.date_from = Date.today().add(-3).months();
	$scope.date_to = '';
	$scope.is_paid = '';
	$scope.is_posted = '';
	$scope.is_active = '1'; // needs to be a string or isn't picked up by Angular...

	var lastParams = {};

	$scope.$on('$viewContentLoaded', function() {

		$scope.picker = {
			invoiceDateFrom: { opened: false },
			invoiceDateTo: { opened: false },
			open: function(field) { $scope.picker[field].opened = true; },
			options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
		};

	});

	$scope.sortBy = function(orderProp) {
		$scope.reverseProp = ($scope.orderProp === orderProp) ? !$scope.reverseProp : false;
		$scope.orderProp = orderProp;
	}

	$scope.change = function() {

		var params = {
			'date_from': Dates.dateInput($scope.date_from),
			'date_to': Dates.dateInput($scope.date_to),
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

	$scope.emptyPostInvoice = function(id) {

		// not sure this is required - just use an id?
		$scope.invoice = {};
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

		$scope.invoice = {};
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

		$scope.invoice = {};
		$scope.invoice.id = id;
		$scope.invoice.date_paid = Dates.todays_date();

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
				customer_id: function () { return ''; }
			}
		});

		popup.result.then(function(invoice) {
			$scope.invoices.push(invoice);
		});

	}

	$scope.populateInvoice = function(id) {

		var popup = $uibModal.open({
			templateUrl: 'partials/invoices/fragments/form.html',
			controller: 'modalEditInvoiceCtrl',
			size: 'lg',
			resolve: {
				id: function () { return id; },
				customer_id: function () { return ''; }
			}
		});

		popup.result.then(function(invoice) {
			for (var i in $scope.invoices) {
				if ($scope.invoicss[i].id == id) {
					$scope.invoices[i] = invoice;
				}
			}
		});

	}

	$scope.change();

}

function InvoiceDetailCtrl($scope, $routeParams, $uibModal, Customer, Account, Invoice, Entry, Money, Dates) {

	Customer.query().then(function(customers) {
		$scope.customers = customers;
	});

	Invoice.get($routeParams.invoiceId).then(function(invoice) {
		$scope.invoice = invoice;
		// used to set customer on edit form
		$scope.invoice.customer_id = $scope.invoice.owner.id;
	});

	$scope.populateInvoice = function(id) {

		var popup = $uibModal.open({
			templateUrl: 'partials/invoices/fragments/form.html',
			controller: 'modalEditInvoiceCtrl',
			size: 'lg',
			resolve: {
				id: function () { return id; },
				customer_id: function () { return ''; }
			}
		});

		popup.result.then(function(invoice) {
			$scope.invoice = invoice;
		});

	}

	$scope.emptyPostInvoice = function() {

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
			$scope.invoice = invoice;
		});

	}

	$scope.emptyPayInvoice = function() {
		
		$scope.invoice.date_paid = Dates.todays_date();

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
			$scope.invoice = invoice;
		});

	}

	$scope.emptyEntry = function() {

		guid = '';

		var popup = $uibModal.open({
			templateUrl: 'partials/invoices/fragments/entryform.html',
			controller: 'modalEditEntryCtrl',
			size: 'lg',
			resolve: {
				guid: function () { return guid; },
				invoice: function () { return $scope.invoice; }
			}
		});

		popup.result.then(function(invoice) {
			$scope.invoice = invoice;
		});

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

		var popup = $uibModal.open({
			templateUrl: 'partials/invoices/fragments/entryform.html',
			controller: 'modalEditEntryCtrl',
			size: 'lg',
			resolve: {
				guid: function () { return guid; },
				invoice: function () { return $scope.invoice; }
			}
		});

		popup.result.then(function(invoice) {
			$scope.invoice = invoice;
		});

	}

}

function InvoicePrintCtrl($scope, $routeParams, $localStorage, $sce, Invoice) {

	Invoice.get($routeParams.invoiceId).then(function(invoice) {
	$scope.invoice = invoice;

		// sort this out in settings page
		$scope.storage = $localStorage.$default({
			invoiceMessage: 'Thank you for your patronage',
			companyName : '',
			companyAddressLine1 : '',
			companyAddressLine2 : '',
			companyAddressLine3 : '',
			companyAddressLine4 : '',
		});

		$scope.invoiceMessageHtml = $sce.trustAsHtml($scope.invoice.notes.replace(/(?:\r\n|\r|\n)/g, '<br>') + '<br><br>' + $scope.storage.invoiceMessage.replace(/(?:\r\n|\r|\n)/g, '<br>'));
	});
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

	Account.getAccountsOfTypesAndPlaceholdersForDropdown([ACCT_TYPE_BANK, ACCT_TYPE_ASSET, ACCT_TYPE_LIABILITY, ACCT_TYPE_CASH, ACCT_TYPE_CREDIT]).then(function(transferAccounts) {
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

// this is bad due to the case...
app.controller('modalEditInvoiceCtrl', ['id', 'customer_id', '$scope', '$uibModalInstance', 'Invoice', 'Customer', 'Dates', function(id, customer_id, $scope, $uibModalInstance, Invoice, Customer, Dates) {

	Customer.query().then(function(customers) {
		$scope.customers = customers;
	});

	// this doesn't seem to show the date on opening (even though it's there...)
	$scope.picker = {
		invoiceDateOpened: { opened: false },
		open: function(field) { $scope.picker[field].opened = true; },
		options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
	};

	if (id == 0) {
		$scope.invoiceTitle = 'Add invoice';
		$scope.invoiceNew = 1;

		$scope.invoice = {};
		$scope.invoice.id = '';
		$scope.invoice.customer_id = customer_id;
		$scope.invoice.currency = '';
		$scope.invoice.active = '';
		$scope.invoice.date_opened = Dates.todays_date();
		$scope.invoice.notes = '';
	} else {
		Invoice.get(id).then(function(invoice) {
			$scope.invoiceTitle = 'Edit invoice';
			$scope.invoiceNew = 0;

			$scope.invoice = invoice;
			// date opened and customer_id don't map directly to the invoice object
			$scope.invoice.customer_id = invoice.owner.id;
			$scope.invoice.date_opened = Dates.dateOutput(invoice.date_opened);

		});
	}

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.saveInvoice = function() {

		if ($scope.invoiceNew == 1) {
			
			for (var i = 0; i < $scope.customers.length; i++) {
				if ($scope.customers[i].id == $scope.invoice.customer_id) {
					$scope.invoice.customer_currency = $scope.customers[i].currency;
				}
			}

			var params = {
				id: $scope.invoice.id,
				active: $scope.invoice.active,
				customer_id: $scope.invoice.customer_id,
				currency: $scope.invoice.customer_currency,
				date_opened: Dates.dateInput($scope.invoice.date_opened),
				notes: $scope.invoice.notes
			};

			Invoice.add(params).then(function(invoice) {

				$('#invoiceAlert').hide();
				$uibModalInstance.close(invoice);	

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

		} else {			

			var params = {
				id: id,
				active: $scope.invoice.active,
				customer_id: $scope.invoice.customer_id,
				currency: $scope.invoice.currency,
				date_opened: Dates.dateInput($scope.invoice.date_opened),
				notes: $scope.invoice.notes
			};

			Invoice.update(id, params).then(function(invoice) {

				$('#invoiceAlert').hide();
				$uibModalInstance.close(invoice);	

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
	}

}]);

// this is bad due to the case...
app.controller('modalEditEntryCtrl', ['guid', 'invoice',  '$scope', '$uibModalInstance', 'Account', 'Invoice', 'Entry', 'Dates', function(guid, invoice, $scope, $uibModalInstance, Account, Invoice, Entry, Dates) {

	Account.getInvoiceAccountsForDropdown().then(function(accounts) {
		$scope.accounts = accounts;
	});

	$scope.discount_types = [{
		key: 1, value: '£'
	}];

	// this doesn't seem to show the date on opening (even though it's there...)
	$scope.picker = {
		entryDate: { opened: false },
		open: function(field) { $scope.picker[field].opened = true; },
		options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
	};

	if (guid == '') {

		$scope.entryTitle = 'Add entry';

		$scope.entryNew = 1;

		$scope.entry = {};
		$scope.entry.inv_account = {};
		
		$scope.entry.guid = '';
		$scope.entry.date = Dates.todays_date(); // this should probably default to the invoice date - not today's
		$scope.entry.description = '';

		$scope.entry.inv_account.guid = '';
		$scope.entry.quantity = '';
		$scope.entry.inv_price = '';
		$scope.entry.discount_type = 1;
		$scope.entry.discount = '';
	} else {
		Entry.get(guid).then(function(entry) {
			$scope.entryTitle = 'Edit entry';
			$scope.entryNew = 0;

			$scope.entry = entry;

			// date dosen't map directly to the entry object
			$scope.entry.date = Dates.dateOutput(entry.date);
		});
	}

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.saveEntry = function() {

		if ($scope.entryNew == 1) {

			var params = {
				date: Dates.dateInput($scope.entry.date),
				description: $scope.entry.description,
				account_guid: $scope.entry.inv_account.guid,
				quantity: $scope.entry.quantity,
				price: $scope.entry.inv_price,
				discount_type: $scope.entry.discount_type,
				discount: (($scope.entry.discount == '') ? 0 : $scope.entry.discount) // allow discount to be left blank for easy entry
			};

			Entry.add('invoice', invoice.id, params).then(function(entry) {
				
				// we need the invoice to come though...
				invoice.entries.push(entry);

				invoice = Invoice.recalculate(invoice);

				$('#entryAlert').hide();
				$uibModalInstance.close(invoice);

			}, function(data) {
				// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
				if(typeof data.errors != 'undefined') {
					$('#entryAlert').show();
					$scope.entryError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});
			
		} else {

			var params = {
				guid: guid,
				date: Dates.dateInput($scope.entry.date),
				description: $scope.entry.description,
				account_guid: $scope.entry.inv_account.guid,
				quantity: $scope.entry.quantity,
				price: $scope.entry.inv_price,
				discount_type: $scope.entry.discount_type,
				discount: $scope.entry.discount
			};

			Entry.update(guid, params).then(function(entry) {
				
				for (var i = 0; i < invoice.entries.length; i++) {
					if (invoice.entries[i].guid == entry.guid) {
						invoice.entries[i] = entry;
					}
				}

				invoice = Invoice.recalculate(invoice);
				
				$('#entryAlert').hide();
				$uibModalInstance.close(invoice);	

				$scope.entry.guid = '';
				$scope.entry.date = '';
				$scope.entry.description = '';
				$scope.entry.inv_account.guid = '';
				$scope.entry.quantity = '';
				$scope.entry.inv_price = '';
				$scope.entry.discount_type = 1;
				$scope.entry.discount = '';

			}, function(data) {
				// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
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

}]);