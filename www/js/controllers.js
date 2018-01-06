function AccountListCtrl($scope, $http, $timeout) {
	
	$http.get('/api/accounts')
		.success(function(data) {
			$scope.accounts = getSubAccounts($http, $timeout, data, 0);

			for (var account in $scope.accounts) {

				$scope.accounts[account].balance_html = format_currency($scope.accounts[account].type_id, $scope.accounts[account].currency, $scope.accounts[account].balance);

				$scope.accounts[account].balance_gbp_html = format_currency($scope.accounts[account].type_id, $scope.accounts[account].currency, $scope.accounts[account].balance_gbp);

			}
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

}

function AccountDetailCtrl($scope, $routeParams, $http, $timeout, $route) {
	$http.get('/api/accounts/' + $routeParams.accountGuid)
		.success(function(data) {
			$scope.account = data;

			$http.get('/api/accounts/' + $routeParams.accountGuid + '/splits').success(function(data) {
				$scope.splits = data;

				for (var split in $scope.splits) {

					//console.log($scope.splits[split].amount);

					if ($scope.account.type_id == 0) {
						if ($scope.splits[split].amount > 0) {
							$scope.splits[split].income = format_currency($scope.account.type_id, $scope.account.currency, $scope.splits[split].amount);
							$scope.splits[split].charge = '';
						} else {
							$scope.splits[split].income = '';
							$scope.splits[split].charge = format_currency($scope.account.type_id, $scope.account.currency, -$scope.splits[split].amount);
						}
					} else if ($scope.account.type_id != 8) {
						$scope.splits[split].charge = format_currency(8, $scope.account.currency, $scope.splits[split].amount);
						$scope.splits[split].income = '';
					} else {
						$scope.splits[split].income = format_currency(8, $scope.account.currency, $scope.splits[split].amount);
						$scope.splits[split].charge = '';
					}

					$scope.splits[split].balance = format_currency($scope.account.type_id, $scope.account.currency, $scope.splits[split].balance);
					$scope.splits[split].amount = format_currency($scope.account.type_id, $scope.account.currency, $scope.splits[split].amount);
					
					/*if ($scope.account.type_id == 8) {
						$scope.splits[split].balance = -($scope.splits[split].balance);
						$scope.splits[split].amount = -($scope.splits[split].amount);
					}*/

					
				}
			});

		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	$http.get('/api/accounts')
		.success(function(data) {
			var accounts = getSubAccounts($http, $timeout, data, 0);
			var nonPlaceholderAccounts = [];

			// limit accounts to income accounts and remove placeholder accounts 
			for (var i in accounts) {
				if (!accounts[i].placeholder) {
					nonPlaceholderAccounts.push(accounts[i]);
				}
			}

			$scope.accounts = nonPlaceholderAccounts;
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	$('#transactionDatePosted').datepicker({
		'dateFormat': 'yy-mm-dd',
		'onSelect': function(dateText) {
			if (window.angular && angular.element) {
				angular.element(this).controller("ngModel").$setViewValue(dateText);
			}
		}
	});

	$scope.addTransaction = function() {

		var data = {
			currency: 'GBP',
			num: $scope.transaction.num,
			date_posted: $scope.transaction.date_posted,
			description: $scope.transaction.description,
			//splitvalue1: $scope.transaction.splitValue1*100,
			splitaccount1: $scope.transaction.splitAccount1,
			//splitvalue2: -$scope.transaction.splitValue1*100,
			splitaccount2: $scope.account.guid
		};

		if ($scope.account.type_id == 0) { // bank
			data.splitvalue1 = -Math.round($scope.transaction.splitValue1*100);
			data.splitvalue2 = Math.round($scope.transaction.splitValue1*100);
		} else {
			data.splitvalue1 = Math.round($scope.transaction.splitValue1*100);
			data.splitvalue2 = -Math.round($scope.transaction.splitValue1*100);
		}

		$http({
			method: 'POST',
			url: '/api/transactions',
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			//$scope.invoice.entries.push(data);
			$('#transactionForm').modal('hide');
			$('#transactionAlert').hide();

			$scope.transaction.num = '';
			$scope.transaction.date_posted = '';
			$scope.transaction.description = '';
			$scope.transaction.splitAccount1 = '';
			$scope.transaction.splitValue1 = '';

			$route.reload();
			
		}).error(function(data, status, headers, config) {
			if(typeof data.errors != 'undefined') {
				$('#transactionAlert').show();
				$scope.transactionError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});
	}

	$scope.emptyTransaction = function() {

		$scope.transactionTitle = 'Add transaction';

		$scope.transactionNew = 1;

		$scope.transaction = {};

		$scope.transaction.num = '';
		$scope.transaction.date_posted = '';
		$scope.transaction.description = '';
		$scope.transaction.splitAccount1 = '';
		$scope.transaction.splitValue1 = '';

		$('#transactionForm').modal('show');

	}

	$scope.populateTransaction = function(guid) {

		$http.get('/api/transactions/' + guid)
			.success(function(data) {
				$scope.transactionTitle = 'Edit transaction';
				$scope.transactionNew = 0;

				$scope.transaction = data;

				if ($scope.transaction.splits.length == 2) {
					if ($scope.transaction.splits[0].account.guid == $routeParams.accountGuid) {
						$scope.transaction.splitGuid1 = $scope.transaction.splits[1].guid;
						$scope.transaction.splitAccount1 = $scope.transaction.splits[1].account.guid;
						$scope.transaction.splitValue1 = $scope.transaction.splits[1].amount;
						$scope.transaction.splitGuid2 = $scope.transaction.splits[0].guid;
						$scope.transaction.splitAccount2 = $scope.transaction.splits[0].account.guid;
						$scope.transaction.splitValue2 = $scope.transaction.splits[0].amount;
					} else {
						$scope.transaction.splitGuid1 = $scope.transaction.splits[0].guid;
						$scope.transaction.splitAccount1 = $scope.transaction.splits[0].account.guid;
						$scope.transaction.splitValue1 = $scope.transaction.splits[0].amount;
						$scope.transaction.splitGuid2 = $scope.transaction.splits[1].guid;
						$scope.transaction.splitAccount2 = $scope.transaction.splits[1].account.guid;
						$scope.transaction.splitValue2 = $scope.transaction.splits[1].amount;
					}
				}

				$('#transactionForm').modal('show');
			})
			.error(function(data, status) {
				handleApiErrors($timeout, data, status);
			})
		;

	}

	$scope.saveTransaction = function() {
		if ($scope.transactionNew == 1) {
			$scope.addTransaction();
		} else {
			// This may fail as it's possible to update the ID
			$scope.updateTransaction($scope.transaction.guid);
		}
	}

	$scope.updateTransaction = function(guid) {

		var data = {
			currency: 'GBP',
			num: $scope.transaction.num,
			date_posted: $scope.transaction.date_posted,
			description: $scope.transaction.description,
			splitguid1: $scope.transaction.splitGuid1,
			splitvalue1: $scope.transaction.splitValue1*100,
			splitaccount1: $scope.transaction.splitAccount1,
			splitguid2: $scope.transaction.splitGuid2,
			splitvalue2: -$scope.transaction.splitValue1*100,
			splitaccount2: $scope.account.guid
		};

		$http({
			method: 'POST',
			url: '/api/transactions/' + guid,
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			$('#transactionForm').modal('hide');
			$('#transactionAlert').hide();

			$route.reload();

			/*for (var i = 0; i < $scope.customers.length; i++) {
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
			$scope.customer.address.email = '';*/
			
		}).error(function(data, status, headers, config) {
			if(typeof data.errors != 'undefined') {
				$('#transactionAlert').show();
				$scope.transactionError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});
	}

	$scope.deleteTransaction = function(guid) {

		$http({
			method: 'DELETE',
			url: '/api/transactions/' + guid
		}).success(function(data) {

			for (var i = 0; i < $scope.splits.length; i++) {
				if ($scope.splits[i].transaction.guid == guid) {
					$scope.splits.splice(i, 1);
				}
			}
			
		}).error(function(data, status) {
			handleApiErrors($timeout, data, status);
		});

	}

}

function BillListCtrl($scope, $http, $timeout) {

	$scope.date_opened_from = '';
	$scope.date_opened_to = '';
	$scope.is_paid = '';
	$scope.is_active = 1;

	var lastParams = '';

	$scope.change = function() {

		var params = '';

		if(/[0-9]{4}-[0-9]{2}-[0-9]{2}/i.test($scope.date_opened_from)) {
			if (params != '') {
				params = params + '&';
			}
			params = params + 'date_opened_from=' + $scope.date_opened_from;
		}

		if(/[0-9]{4}-[0-9]{2}-[0-9]{2}/i.test($scope.date_opened_to)) {
			if (params != '') {
				params = params + '&';
			}
			params = params + 'date_opened_to=' + $scope.date_opened_to;
		}

		if ($scope.is_paid != '') {
			if (params != '') {
				params = params + '&';
			}
			params = params + 'is_paid=' + $scope.is_paid;
		}

		if ($scope.is_active != '') {
			if (params != '') {
				params = params + '&';
			}
			params = params + 'is_active=' + $scope.is_active;
		}

		if (params != '') {
			params = '?' +  params;
		}
		
		if (params != lastParams) {

			$http.get('/api/bills' + params)
				.success(function(data) {
					$scope.bills = data;

					for (var bill in $scope.bills) {
						$scope.bills[bill].total = format_currency(8, 'GBP', -$scope.bills[bill].total);
					}
				})
				.error(function(data, status) {
					handleApiErrors($timeout, data, status);
				})
			;

			lastParams = params;

		}
	}

	$scope.change();

}

function InvoiceListCtrl($scope, $http, $timeout) {

	$scope.date_due_from = '';
	$scope.date_due_to = '';
	$scope.is_paid = '';
	$scope.is_active = 1;

	var lastParams = '';

	$scope.change = function() {

		var params = '';

		if(/[0-9]{4}-[0-9]{2}-[0-9]{2}/i.test($scope.date_due_from)) {
			if (params != '') {
				params = params + '&';
			}
			params = params + 'date_due_from=' + $scope.date_due_from;
		}

		if(/[0-9]{4}-[0-9]{2}-[0-9]{2}/i.test($scope.date_due_to)) {
			if (params != '') {
				params = params + '&';
			}
			params = params + 'date_due_to=' + $scope.date_due_to;
		}

		if ($scope.is_paid != '') {
			if (params != '') {
				params = params + '&';
			}
			params = params + 'is_paid=' + $scope.is_paid;
		}

		if ($scope.is_active != '') {
			if (params != '') {
				params = params + '&';
			}
			params = params + 'is_active=' + $scope.is_active;
		}

		if (params != '') {
			params = '?' +  params;
		}
		
		if (params != lastParams) {

			$http.get('/api/invoices' + params)
				.success(function(data) {
					$scope.invoices = data;

					for (var invoice in $scope.invoices) {
						$scope.invoices[invoice].total = format_currency(8, 'GBP', -$scope.invoices[invoice].total);
					}
				})
				.error(function(data, status) {
					handleApiErrors($timeout, data, status);
				})
			;

			lastParams = params;

		}
	}

	$scope.change();

}

function InvoiceDetailCtrl($scope, $routeParams, $http, $timeout) {

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

			// limit accounts to income accounts and remove placeholder accounts 
			for (var i in accounts) {
				if (accounts[i].type_id == 8 && !accounts[i].placeholder) {
					invoiceAccounts.push(accounts[i]);
				}
			}

			$scope.accounts = invoiceAccounts;
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	$http.get('/api/invoices/' + $routeParams.invoiceId)
		.success(function(data) {
			$scope.invoice = data;

			$scope.invoice.notes = nl2br($scope.invoice.notes);
			$scope.invoice.date_opened = dateFormat($scope.invoice.date_opened);
			$scope.invoice.date_due = dateFormat($scope.invoice.date_due);

			for (var entry in $scope.invoice.entries) {
				$scope.invoice.entries[entry].date = dateFormat($scope.invoice.entries[entry].date);
				$scope.invoice.entries[entry].total_ex_discount = $scope.invoice.entries[entry].quantity * $scope.invoice.entries[entry].inv_price;
				// does not take into account discounts - how do these work?
				$scope.invoice.entries[entry].total_inc_discount = $scope.invoice.entries[entry].total_ex_discount.formatMoney(2, '.', ',');
				$scope.invoice.entries[entry].inv_price = $scope.invoice.entries[entry].inv_price.formatMoney(2, '.', ',');
				$scope.invoice.entries[entry].discount = $scope.invoice.entries[entry].discount.formatMoney(2, '.', ',');
			}

			$scope.invoice.total = $scope.invoice.total.formatMoney(2, '.', ',');
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

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

		$http.get('/api/invoices/' + id)
			.success(function(data) {
				$scope.invoiceTitle = 'Edit invoice';
				//$scope.invoiceNew = 0;
				$scope.invoice = data;
				$('#invoiceForm').modal('show');
			})
			.error(function(data, status) {
				handleApiErrors($timeout, data, status);
			})
		;

	}

	$scope.saveInvoice = function() {

		var data = {
			id: $scope.invoice.id,
			customer_id: $scope.invoice.owner.id,
			currency: 'GBP',
			date_opened: $scope.invoice.date_opened,
			notes: $scope.invoice.notes
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

			$('#invoiceForm').modal('hide');
			$('#invoiceAlert').hide();

			$scope.invoice = data;

			
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

	$scope.addEntry = function() {

		var data = {
			date: $scope.entry.date,
			description: $scope.entry.description,
			account_guid: $scope.entry.inv_account.guid,
			quantity: $scope.entry.quantity,
			price: $scope.entry.inv_price
		};

		$http({
			method: 'POST',
			url: '/api/invoices/' + $scope.invoice.id + '/entries' ,
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			data.date = dateFormat(data.date);
			data.total_ex_discount = data.quantity * data.inv_price;
			// does not take into account discounts - how do these work?
			data.total_inc_discount = data.total_ex_discount.formatMoney(2, '.', ',');
			data.inv_price = data.inv_price.formatMoney(2, '.', ',');
			data.discount = data.discount.formatMoney(2, '.', ',');

			$scope.invoice.entries.push(data);
			$('#entryForm').modal('hide');
			$('#entryAlert').hide();

			$scope.entry.guid = '';
			$scope.entry.date = '';
			$scope.entry.description = '';
			$scope.entry.inv_account.guid = '';
			$scope.entry.quantity = '';
			$scope.entry.inv_price = '';
			
		}).error(function(data, status, headers, config) {
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

		$('#entryForm').modal('show');

	}

	$scope.deleteEntry = function(guid) {

		$http({
			method: 'DELETE',
			url: '/api/entries/' + guid
		}).success(function(data) {

			for (var i = 0; i < $scope.invoice.entries.length; i++) {
				if ($scope.invoice.entries[i].guid == guid) {
					$scope.invoice.entries.splice(i, 1);
				}
			}
			
		}).error(function(data, status) {
			handleApiErrors($timeout, data, status);
		});

	}

	$scope.populateEntry = function(guid) {

		$http.get('/api/entries/' + guid)
			.success(function(data) {
				$scope.entryTitle = 'Edit entry';
				$scope.entryNew = 0;
				$scope.entry = data;
				$('#entryForm').modal('show');
			})
			.error(function(data, status) {
				handleApiErrors($timeout, data, status);
			})
		;

	}

	$scope.updateEntry = function(guid) {

		var data = {
			guid: $scope.entry.guid,
			date: $scope.entry.date,
			description: $scope.entry.description,
			account_guid: $scope.entry.inv_account.guid,
			quantity: $scope.entry.quantity,
			price: $scope.entry.inv_price
		};

		$http({
			method: 'POST',
			url: '/api/entries/' + guid,
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			for (var i = 0; i < $scope.invoice.entries.length; i++) {
				if ($scope.invoice.entries[i].guid == data.guid) {
					$scope.invoice.entries[i] = data;

					$scope.invoice.entries[i].date = dateFormat($scope.invoice.entries[i].date);
					$scope.invoice.entries[i].total_ex_discount = $scope.invoice.entries[i].quantity * $scope.invoice.entries[i].inv_price;
					// does not take into account discounts - how do these work?
					$scope.invoice.entries[i].total_inc_discount = $scope.invoice.entries[i].total_ex_discount.formatMoney(2, '.', ',');
					$scope.invoice.entries[i].inv_price = $scope.invoice.entries[i].inv_price.formatMoney(2, '.', ',');
					$scope.invoice.entries[i].discount = $scope.invoice.entries[i].discount.formatMoney(2, '.', ',');
				}
			}

			$('#entryForm').modal('hide');
			$('#entryAlert').hide();

			$scope.entry.guid = '';
			$scope.entry.date = '';
			$scope.entry.description = '';
			$scope.entry.inv_account.guid = '';
			$scope.entry.quantity = '';
			$scope.entry.inv_price = '';
			
		}).error(function(data, status, headers, config) {
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

function BillDetailCtrl($scope, $routeParams, $http, $timeout) {

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

			// limit accounts to income accounts and remove placeholder accounts 
			for (var i in accounts) {
				if (accounts[i].type_id == 9 && !accounts[i].placeholder) {
					billAccounts.push(accounts[i]);
				}
			}

			$scope.accounts = billAccounts;
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	$http.get('/api/bills/' + $routeParams.billId)
		.success(function(data) {
			$scope.bill = data;

			$scope.bill.notes = nl2br($scope.bill.notes);
			$scope.bill.date_opened = dateFormat($scope.bill.date_opened);
			$scope.bill.date_due = dateFormat($scope.bill.date_due);

			for (var entry in $scope.bill.entries) {
				$scope.bill.entries[entry].date = dateFormat($scope.bill.entries[entry].date);
				$scope.bill.entries[entry].total_ex_discount = $scope.bill.entries[entry].quantity * $scope.bill.entries[entry].bill_price;
				// does not take into account discounts - how do these work?
				$scope.bill.entries[entry].total_inc_discount = $scope.bill.entries[entry].total_ex_discount.formatMoney(2, '.', ',');
				$scope.bill.entries[entry].bill_price = $scope.bill.entries[entry].bill_price.formatMoney(2, '.', ',');
				$scope.bill.entries[entry].discount = $scope.bill.entries[entry].discount.formatMoney(2, '.', ',');
			}

			$scope.bill.total = $scope.bill.total.formatMoney(2, '.', ',');
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	$scope.entry = {};
	$scope.entry.bill_account = {};

	$scope.entry.guid = '';
	$scope.entry.date = '';
	$scope.entry.description = '';
	$scope.entry.bill_account.guid = '';
	$scope.entry.quantity = '';
	$scope.entry.bill_price = '';

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

		$http.get('/api/bills/' + id)
			.success(function(data) {
				$scope.invoiceTitle = 'Edit bill';
				//$scope.billNew = 0;
				$scope.bill = data;
				$('#billForm').modal('show');
			})
			.error(function(data, status) {
				handleApiErrors($timeout, data, status);
			})
		;

	}

	$scope.saveBill = function() {

		var data = {
			id: $scope.bill.id,
			vendor_id: $scope.bill.owner.id,
			currency: 'GBP',
			date_opened: $scope.bill.date_opened,
			notes: $scope.bill.notes
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

			$('#billForm').modal('hide');
			$('#billAlert').hide();

			$scope.bill = data;

			
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

	$scope.addEntry = function() {

		var data = {
			date: $scope.entry.date,
			description: $scope.entry.description,
			account_guid: $scope.entry.bill_account.guid,
			quantity: $scope.entry.quantity,
			price: $scope.entry.bill_price
		};

		$http({
			method: 'POST',
			url: '/api/bills/' + $scope.bill.id + '/entries' ,
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			data.date = dateFormat(data.date);
			data.total_ex_discount = data.quantity * data.bill_price;
			// does not take into account discounts - how do these work?
			data.total_inc_discount = data.total_ex_discount.formatMoney(2, '.', ',');
			data.bill_price = data.bill_price.formatMoney(2, '.', ',');
			data.discount = data.discount.formatMoney(2, '.', ',');

			$scope.bill.entries.push(data);
			$('#entryForm').modal('hide');
			$('#entryAlert').hide();

			$scope.entry.guid = '';
			$scope.entry.date = '';
			$scope.entry.description = '';
			$scope.entry.bill_account.guid = '';
			$scope.entry.quantity = '';
			$scope.entry.bill_price = '';
			
		}).error(function(data, status, headers, config) {
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

		$('#entryForm').modal('show');

	}

	$scope.deleteEntry = function(guid) {

		$http({
			method: 'DELETE',
			url: '/api/entries/' + guid
		}).success(function(data) {

			for (var i = 0; i < $scope.bill.entries.length; i++) {
				if ($scope.bill.entries[i].guid == guid) {
					$scope.bill.entries.splice(i, 1);
				}
			}
			
		}).error(function(data, status, headers, config) {
			console.log(data);
			console.log(status);
		});

	}

	$scope.populateEntry = function(guid) {

		$http.get('/api/entries/' + guid)
			.success(function(data) {
				$scope.entryTitle = 'Edit entry';
				$scope.entryNew = 0;
				$scope.entry = data;
				$('#entryForm').modal('show');
			})
			.error(function(data, status) {
				handleApiErrors($timeout, data, status);
			})
		;

	}

	$scope.updateEntry = function(guid) {

		var data = {
			guid: $scope.entry.guid,
			date: $scope.entry.date,
			description: $scope.entry.description,
			account_guid: $scope.entry.bill_account.guid,
			quantity: $scope.entry.quantity,
			price: $scope.entry.bill_price
		};

		$http({
			method: 'POST',
			url: '/api/entries/' + guid,
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data: data,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).success(function(data) {

			for (var i = 0; i < $scope.bill.entries.length; i++) {
				if ($scope.bill.entries[i].guid == data.guid) {
					$scope.bill.entries[i] = data;

					$scope.bill.entries[i].date = dateFormat($scope.bill.entries[i].date);
					$scope.bill.entries[i].total_ex_discount = $scope.bill.entries[i].quantity * $scope.bill.entries[i].bill_price;
					// does not take into account discounts - how do these work?
					$scope.bill.entries[i].total_inc_discount = $scope.bill.entries[i].total_ex_discount.formatMoney(2, '.', ',');
					$scope.bill.entries[i].bill_price = $scope.bill.entries[i].bill_price.formatMoney(2, '.', ',');
					$scope.bill.entries[i].discount = $scope.bill.entries[i].discount.formatMoney(2, '.', ',');
				}
			}

			$('#entryForm').modal('hide');
			$('#entryAlert').hide();

			$scope.entry.guid = '';
			$scope.entry.date = '';
			$scope.entry.description = '';
			$scope.entry.bill_account.guid = '';
			$scope.entry.quantity = '';
			$scope.entry.bill_price = '';
			
		}).error(function(data, status, headers, config) {
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

function nl2br (str, is_xhtml) {
	var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
	return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
}

function dateFormat(str) {
	if (str != null) {
		var d = new Date(str.substring(0,4) + '-' + str.substring(5,7) + '-' + str.substring(8,10));
		return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
	} else {
		return '';
	}
}

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

	$http.get('/api/vendors/' + $routeParams.vendorId + '/bills')
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

function ReportIncomeStatementCtrl($scope, $http, $timeout) {

	var monthNames = [ "January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December" ];

	//console.log(Date.today().getMonth());

	$scope.months = [];
	$scope.currentMonth = 9;

	for (var i=0; i>-10; i--) {
		var date_from = Date.today().set({ day: 1}).add({ months: i });
		var date_to = Date.today().set({ day: 1}).add({ months: i + 1 });
		
		$scope.months.unshift({
				'id': -i,
				'date_from': date_from.getFullYear() + '-' + pad(date_from.getMonth() + 1) + '-01',
				'date_to': date_to.getFullYear() + '-' + pad(date_to.getMonth() + 1) + '-01',
				'name': monthNames[date_from.getMonth()]
		});
	}

	$scope.setMonth = function(month_id) {
		$scope.currentMonth = 9-month_id;
		generateIncomeAccounts($scope, $http);
	}

	//console.log($scope.currentMonth);

	$http.get('/api/accounts/' + 'b5d821ef2a71ab2af3f252bddc28df2d' + '/splits?date_posted_from=' + '2014-10-01' + '&date_posted_to=' + '2014-11-01', {'account_id': 'b5d821ef2a71ab2af3f252bddc28df2d'})
		.success(function(data, status, headers, config) {
			var accountAmount = 0;
			for (var split in data) {
				console.log(data[split].transaction.num + ' ');
				console.log(data[split]);
				//accountAmount = accountAmount + data[split].amount;
			
			}
			// $scope.incomeAccounts[config.account_id].total = format_currency($scope.incomeAccounts[config.account_id].type_id, $scope.incomeAccounts[config.account_id].currency, accountAmount);
			// $scope.incomeTotal =  $scope.incomeTotal + accountAmount;
			// $scope.displayIncomeTotal = format_currency(8, 'GBP', $scope.incomeTotal);
			// $scope.grandTotal = $scope.incomeTotal + $scope.expensesTotal;
			// $scope.displayGrandTotal = format_currency(8, 'GBP', $scope.grandTotal);
		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

	generateIncomeAccounts($scope, $http);

}

function pad(number) {
	if (number<=99) { number = ("00"+number).slice(-2); }
	return number;
}

function generateIncomeAccounts($scope, $http, $timeout) {

	$scope.incomeTotal = 0;
	$scope.displayIncomeTotal = '';

	$scope.expensesTotal = 0;
	$scope.displayExpensesTotal = '';

	$scope.grandTotal = 0;
	$scope.displayGrandTotal = '';

	$http.get('/api/accounts')
		.success(function(data) {
			var accounts = getSubAccounts($http, $timeout, data, 0);

			var incomeAccounts = [];
			var expensesAccounts = [];

			for (var account in accounts) {
				// would it be good if there was a way of returning flat accounts by type?
				if (accounts[account].type_id == 8 && accounts[account].level == 0) {
					incomeAccounts.push(accounts[account]);
				} else if (accounts[account].type_id == 9 && accounts[account].level == 0) {
					expensesAccounts.push(accounts[account]);
				}
			}

			$http.get('/api/accounts/' + incomeAccounts[0].guid)
				.success(function(data) {
					$scope.incomeAccounts = getSubAccounts($http, $timeout, data, 0);		
					for (var account in $scope.incomeAccounts) {
						$http.get('/api/accounts/' + $scope.incomeAccounts[account].guid + '/splits?date_posted_from=' + $scope.months[$scope.currentMonth].date_from + '&date_posted_to=' + $scope.months[$scope.currentMonth].date_to, {'account_id': account})
							.success(function(data, status, headers, config) {
								var accountAmount = 0;
								for (var split in data) {
									accountAmount = accountAmount + data[split].amount;
								
								}
								$scope.incomeAccounts[config.account_id].total = format_currency($scope.incomeAccounts[config.account_id].type_id, $scope.incomeAccounts[config.account_id].currency, accountAmount);
								$scope.incomeTotal =  $scope.incomeTotal + accountAmount;
								$scope.displayIncomeTotal = format_currency(8, 'GBP', $scope.incomeTotal);
								$scope.grandTotal = $scope.incomeTotal + $scope.expensesTotal;
								$scope.displayGrandTotal = format_currency(8, 'GBP', $scope.grandTotal);
							})
							.error(function(data, status) {
								handleApiErrors($timeout, data, status);
							})
						;
					}	
				})
				.error(function(data, status) {
					handleApiErrors($timeout, data, status);
				})
			;

			$http.get('/api/accounts/' + expensesAccounts[0].guid)
				.success(function(data) {
					$scope.expensesAccounts = getSubAccounts($http, $timeout, data, 0);		
					for (var account in $scope.expensesAccounts) {
						$http.get('/api/accounts/' + $scope.expensesAccounts[account].guid + '/splits?date_posted_from=' + $scope.months[$scope.currentMonth].date_from + '&date_posted_to=' + $scope.months[$scope.currentMonth].date_to, {'account_id': account})
							.success(function(data, status, headers, config) {
								var accountAmount = 0;
								for (var split in data) {
									accountAmount = accountAmount + data[split].amount;
								
								}
								$scope.expensesAccounts[config.account_id].total = format_currency($scope.expensesAccounts[config.account_id].type_id, $scope.expensesAccounts[config.account_id].currency, accountAmount);
								$scope.expensesTotal =  $scope.expensesTotal + accountAmount;
								$scope.displayExpensesTotal = format_currency(0, 'GBP', $scope.expensesTotal);
								$scope.grandTotal = $scope.incomeTotal + $scope.expensesTotal;
								$scope.displayGrandTotal = format_currency(8, 'GBP', $scope.grandTotal);
							})
							.error(function(data, status) {
								handleApiErrors($timeout, data, status);
							})
						;
					}	
				})
				.error(function(data, status) {
					handleApiErrors($timeout, data, status);
				})
			;

		})
		.error(function(data, status) {
			handleApiErrors($timeout, data, status);
		})
	;

}

function getSubAccounts($http, $timeout, data, level) {

	var flatAccounts = [];

	for (var i in data.subaccounts) {
		data.subaccounts[i].level = level
		flatAccounts.push(data.subaccounts[i]);
		var subAccounts = getSubAccounts($http, $timeout, data.subaccounts[i], level + 1);
		for (var subAccount in subAccounts) {
			subAccounts[subAccount].name = data.subaccounts[i].name + ':' + subAccounts[subAccount].name;
			flatAccounts.push(subAccounts[subAccount]);
		}
	}

	return flatAccounts;
}

// this is not very angulary - should be injected as an errors/gnucash object
function handleApiErrors($timeout, data, status) {
	if (status == 400 && typeof data != 'undefined') {
		if (data.errors[0] != 'undefined') {
			// alert is a sync function and causes '$digest already in progress' if not wrapped in a timeout
			// need to define timeout
			$timeout(function(){
				alert(data.errors[0].message);
			});
		}
	}
}

Number.prototype.formatMoney = function(c, d, t){
var n = this, 
	c = isNaN(c = Math.abs(c)) ? 2 : c, 
	d = d == undefined ? "." : d, 
	t = t == undefined ? "," : t, 
	s = n < 0 ? "-" : "", 
	i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
	j = (j = i.length) > 3 ? j % 3 : 0;
   return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
 };

 function format_currency(type_id, currency, amount) {

	if (type_id == 8) {
		amount = -(amount);
	}

	var currencyformat = '';

	if (currency == 'GBP') {
		currencyformat = '£';
	}else if (currency == 'USD') {

		currencyformat = '$';
	} else {
		currencyformat = currency + ' ';
	}
	
	if (amount < 0) {
		return '-' + currencyformat + (-(amount)).formatMoney(2, '.', ',')
	//	return '<span style="color: #FF0000">-' + currencyformat + (-(amount)).formatMoney(2, '.', ',') + '</span>';
	} else {
		return currencyformat + amount.formatMoney(2, '.', ',');
	}

 }

 function format_todays_date() {
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1; //January is 0!
	var yyyy = today.getFullYear();

	if(dd<10) {
		dd='0'+dd
	} 

	if(mm<10) {
		mm='0'+mm
	} 

	today = yyyy + '-' + mm + '-' + dd;
	return today;
 }
