function BillListCtrl($scope, $uibModal, Vendor, Bill, Dates) {

	$scope.bills = [];

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
			billDateFrom: { opened: false },
			billDateTo: { opened: false },
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
			
			// Using $scope.bills = Bills.query(params); causes "$scope.bills.push is not a function" - probably because it's a promise not an array...
			Bill.query(params).then(function(bills) {
				$scope.bills = bills;
			});

			lastParams = params;
		}
		
	}

	// copied from bill.js
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

		var popup = $uibModal.open({
			templateUrl: 'partials/bills/fragments/form.html',
			controller: 'modalEditBillCtrl',
			size: 'lg',
			resolve: {
				action: function () { return 'new'; },
				id: function () { return 0; },
				vendor_id: function () { return ''; }
			}
		});

		popup.result.then(function(bill) {
			$scope.bills.push(bill);
		});

	}

	$scope.populateBill = function(id) {

		var popup = $uibModal.open({
			templateUrl: 'partials/bills/fragments/form.html',
			controller: 'modalEditBillCtrl',
			size: 'lg',
			resolve: {
				action: function () { return 'edit'; },
				id: function () { return id; },
				vendor_id: function () { return ''; }
			}
		});

		popup.result.then(function(bill) {
			for (var i in $scope.bills) {
				if ($scope.bills[i].id == id) {
					$scope.bills[i] = bill;
				}
			}
		});

	}

	$scope.change();

}

function BillDetailCtrl($scope, $location, $routeParams, $uibModal, Bill, Vendor, Account, Entry, Dates) {

	Vendor.query().then(function(vendors) {
		$scope.vendors = vendors;
	});

	Bill.get($routeParams.billId).then(function(bill) {
		$scope.bill = bill;
		// used to set vendor on edit form
		$scope.bill.vendor_id = $scope.bill.owner.id;
	});

	$scope.populateBill = function(id) {

		var popup = $uibModal.open({
			templateUrl: 'partials/bills/fragments/form.html',
			controller: 'modalEditBillCtrl',
			size: 'lg',
			resolve: {
				action: function () { return 'edit'; },
				id: function () { return id; },
				vendor_id: function () { return ''; }
			}
		});

		popup.result.then(function(bill) {
			$scope.bill = bill;
		});

	}

	$scope.emptyDuplicateBill = function(id, vendor_id) {

		var popup = $uibModal.open({
			templateUrl: 'partials/bills/fragments/form.html',
			controller: 'modalEditBillCtrl',
			size: 'lg',
			resolve: {
				action: function () { return 'duplicate'; },
				id: function () { return id; },
				vendor_id: function () { return vendor_id; }
			}
		});

		popup.result.then(function(bill) {
			// redirect to new bill
			$location.path('/bills/' + bill.id);
		});

	}

	$scope.emptyPostBill = function() {

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
			$scope.bill = bill;
		});

	}

	$scope.emptyPayBill = function() {
		
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
			$scope.bill = bill;
		});

	}

	$scope.emptyEntry = function() {

		guid = '';

		var popup = $uibModal.open({
			templateUrl: 'partials/bills/fragments/entryform.html',
			controller: 'modalEditBillEntryCtrl',
			size: 'lg',
			resolve: {
				guid: function () { return guid; },
				bill: function () { return $scope.bill; }
			}
		});

		popup.result.then(function(bill) {
			$scope.bill = bill;
		});		

	}

	$scope.deleteEntry = function(guid) {

		Entry.delete(guid).then(function() {
			for (var i = 0; i < $scope.bill.entries.length; i++) {
				if ($scope.bill.entries[i].guid == guid) {
					$scope.bill.entries.splice(i, 1);
				}

				$scope.bill = Bill.recalculate($scope.bill);
			}
		}, function(data) {
			console.log(data);
		});

	}

	$scope.populateEntry = function(guid) {

		var popup = $uibModal.open({
			templateUrl: 'partials/bills/fragments/entryform.html',
			controller: 'modalEditBillEntryCtrl',
			size: 'lg',
			resolve: {
				guid: function () { return guid; },
				bill: function () { return $scope.bill; }
			}
		});

		popup.result.then(function(bill) {
			$scope.bill = bill;
		});

	}

}

// this is bad due to the case...
app.controller('modalPostBillCtrl', ['bill', '$scope', '$uibModalInstance', 'Account', 'Bill', 'Dates', function(bill, $scope, $uibModalInstance, Account, Bill, Dates) {

	$scope.bill = {}
	$scope.bill.date_posted = Dates.todays_date();
	$scope.bill.date_due = Dates.todays_date();
	$scope.bill.posted_accumulatesplits = true;

	$scope.billError = '';

	$scope.picker = {
		billDatePosted: { opened: false },
		billDateDue: { opened: false },
		open: function(field) { $scope.picker[field].opened = true; },
		options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
	};

	Account.getAccountsOfTypesForDropdown([ACCT_TYPE_PAYABLE]).then(function(accounts) {
		$scope.accounts = accounts;
		// fill in default posting account
		$scope.bill.posted_account = accounts[0].guid;
	});

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	// could change to generic function
	$scope.postBill = function() {

		Bill.get(bill.id).then(function(bill) {
			
			var params = {
				vendor_id: bill.owner.id,
				currency: bill.currency,
				date_opened: bill.date_opened,
				notes: bill.notes,
				posted: 1,
				posted_account_guid: $scope.bill.posted_account,
				posted_date: Dates.dateInput($scope.bill.date_posted),
				due_date: Dates.dateInput($scope.bill.date_due),
				posted_memo: $scope.bill.posted_memo,
				posted_accumulatesplits: $scope.bill.posted_accumulatesplits, // this is True but should be 1
				posted_autopay: 0
			};

			Bill.update(bill.id, params).then(function(bill) {

				$scope.billError = '';
				$uibModalInstance.close(bill);				

			}, function(data) {
				if(typeof data.errors != 'undefined') {
					$scope.billError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});

		});

	}

}]);

// do we need all these bits
app.controller('modalUnpostBillCtrl', ['bill', '$scope', '$uibModalInstance', 'Bill', function(bill, $scope, $uibModalInstance, Bill) {

	$scope.bill = {};
	$scope.bill.reset_tax_tables = true;

	$scope.billError = '';

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.unpostBill = function(id) {

		Bill.get(bill.id).then(function(bill) {
			
			var params = {
				reset_tax_tables: $scope.bill.reset_tax_tables,
			};

			Bill.unpost(bill.id, params).then(function(bill) {
			
				$scope.billError = '';
				$uibModalInstance.close(bill);	

			}, function(data) {
				if(typeof data.errors != 'undefined') {
					$scope.billError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});

		});

	}

}]);

app.controller('modalPayBillCtrl', ['bill', '$scope', '$uibModalInstance', 'Account', 'Bill', 'Dates', function(bill, $scope, $uibModalInstance, Account, Bill, Dates) {

	$scope.bill = bill;

	$scope.picker = {
		billDatePaid: { opened: false },
		billDateDue: { opened: false },
		open: function(field) { $scope.picker[field].opened = true; },
		options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
	};
	
	Account.getAccountsOfTypesForDropdown([ACCT_TYPE_PAYABLE]).then(function(accounts) {
		$scope.accounts = accounts;
		// fill in default posting account
		$scope.bill.post_account = accounts[0].guid;
	});

	Account.getAccountsOfTypesAndPlaceholdersForDropdown([ACCT_TYPE_BANK, ACCT_TYPE_ASSET, ACCT_TYPE_LIABILITY, ACCT_TYPE_CASH, ACCT_TYPE_CREDIT]).then(function(transferAccounts) {
		$scope.transferAccounts = transferAccounts;
	});

	$scope.billError = '';

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.payBill = function() {
	
		var params = {
			posted_account_guid: bill.post_account,
			transfer_account_guid: bill.transfer_account,
			payment_date: Dates.dateInput(bill.date_paid),
			num: '',
			memo: '',
			auto_pay: 0,
		};

		Bill.pay(bill.id, params).then(function(bill) {
			
			$scope.billError = '';
			$uibModalInstance.close(bill);	

		}, function(data) {
			if(typeof data.errors != 'undefined') {
				$scope.billError = data.errors[0].message;
			} else {
				console.log(data);
				console.log(status);	
			}
		});

	}
	
}]);

// this is bad due to the case...
app.controller('modalEditBillCtrl', ['action', 'id', 'vendor_id', '$scope', '$uibModalInstance', 'Bill', 'Vendor', 'Entry', 'Dates', function(action, id, vendor_id, $scope, $uibModalInstance, Bill, Vendor, Entry, Dates) {

	$scope.billError = '';

	Vendor.query().then(function(vendors) {
		$scope.vendors = vendors;
	});

	// this doesn't seem to show the date on opening (even though it's there...)
	$scope.picker = {
		billDateOpened: { opened: false },
		open: function(field) { $scope.picker[field].opened = true; },
		options: { showWeeks: false } // temporary fix for 'scope.rows[curWeek][thursdayIndex] is undefined' error
	};

	$scope.billError = '';

	$scope.action = action;

	if (action == 'new') {

		$scope.billTitle = 'Add bill';

		$scope.bill = {};
		$scope.bill.id = '';
		$scope.bill.vendor_id = vendor_id;
		$scope.bill.currency = '';
		$scope.bill.active = '';
		$scope.bill.date_opened = Dates.todays_date();
		$scope.bill.notes = '';
	} else if (action == 'edit') {
		Bill.get(id).then(function(bill) {
			$scope.billTitle = 'Edit bill';

			$scope.bill = bill;
			// date opened and vendor_id don't map directly to the bill object
			$scope.bill.vendor_id = bill.owner.id;
			$scope.bill.date_opened = Dates.dateOutput(bill.date_opened);

		});
	} else if (action == 'duplicate') {
		Bill.get(id).then(function(bill) {
			$scope.billTitle = 'Duplicate bill';

			$scope.original_bill = bill;

			$scope.bill = {};
			$scope.bill.id = '';
			$scope.bill.vendor_id = bill.owner.id;
			$scope.bill.currency = bill.currency;
			$scope.bill.active = bill.active;
			$scope.bill.date_opened = Dates.todays_date();
			$scope.bill.notes = bill.notes;
		});		
	}

	$scope.close = function () {
		$uibModalInstance.dismiss('cancel');
	};

	$scope.saveBill = function() {

		if (action == 'new') {
			
			for (var i = 0; i < $scope.vendors.length; i++) {
				if ($scope.vendors[i].id == $scope.bill.vendor_id) {
					$scope.bill.vendor_currency = $scope.vendors[i].currency;
				}
			}

			var params = {
				id: $scope.bill.id,
				active: $scope.bill.active,
				vendor_id: $scope.bill.vendor_id,
				currency: $scope.bill.vendor_currency,
				date_opened: Dates.dateInput($scope.bill.date_opened),
				notes: $scope.bill.notes
			};

			Bill.add(params).then(function(bill) {

				$scope.billError = '';
				$uibModalInstance.close(bill);	

			}, function(data) {
				// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
				if(typeof data.errors != 'undefined') {
					$scope.billError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});

		} else if (action == 'edit') {			

			var params = {
				id: id,
				active: $scope.bill.active,
				vendor_id: $scope.bill.vendor_id,
				currency: $scope.bill.currency,
				date_opened: Dates.dateInput($scope.bill.date_opened),
				notes: $scope.bill.notes
			};

			Bill.update(id, params).then(function(bill) {

				$scope.billError = '';
				$uibModalInstance.close(bill);	

			}, function(data) {
				// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
				if(typeof data.errors != 'undefined') {
					$scope.billError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});

		} else if (action == 'duplicate') {
			
			for (var i = 0; i < $scope.vendors.length; i++) {
				if ($scope.vendors[i].id == $scope.bill.vendor_id) {
					$scope.bill.vendor_currency = $scope.vendors[i].currency;
				}
			}

			var params = {
				id: $scope.bill.id,
				active: $scope.bill.active,
				vendor_id: $scope.bill.vendor_id,
				currency: $scope.bill.vendor_currency,
				date_opened: Dates.dateInput($scope.bill.date_opened),
				notes: $scope.bill.notes
			};

			Bill.add(params).then(function(bill) {

				for (i = 0; i < $scope.original_bill.entries.length; i++) {
					
					entry = $scope.original_bill.entries[i];

					var params = {
						date: entry.date,
						description: entry.description,
						account_guid: entry.bill_account.guid,
						quantity: entry.quantity,
						price: entry.bill_price
					};

					Entry.add('bill', bill.id, params).then(function(entry) {
						
						// no action as shouldn't fail

					}, function(data) {
						// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
						if(typeof data.errors != 'undefined') {
							$scope.entryError = data.errors[0].message;
						} else {
							console.log(data);
							console.log(status);	
						}
					});

					$scope.billError = '';
					$uibModalInstance.close(bill);

				}

			}, function(data) {
				// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
				if(typeof data.errors != 'undefined') {
					$scope.billError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});

		}
	}

}]);

// conflicts with modalEditEntryCtrl but is very similar - could we change or should we change invoice one?
app.controller('modalEditBillEntryCtrl', ['guid', 'bill',  '$scope', '$uibModalInstance', 'Account', 'Bill', 'Entry', 'Dates', function(guid, bill, $scope, $uibModalInstance, Account, Bill, Entry, Dates) {

	Account.getBillAccountsForDropdown().then(function(accounts) {
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

	$scope.entryError = '';

	if (guid == '') {

		$scope.entryTitle = 'Add entry';

		$scope.entryNew = 1;

		$scope.entry = {};
		$scope.entry.inv_account = {};
		
		$scope.entry.guid = '';
		$scope.entry.date = Dates.todays_date(); // this should probably default to the bill date - not today's
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
				account_guid: $scope.entry.bill_account.guid,
				quantity: $scope.entry.quantity,
				price: $scope.entry.bill_price
			};

			Entry.add('bill', bill.id, params).then(function(entry) {
				
				// we need the bill to come though...
				bill.entries.push(entry);

				bill = Bill.recalculate(bill);

				$scope.entryError = '';
				$uibModalInstance.close(bill);

			}, function(data) {
				// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
				if(typeof data.errors != 'undefined') {
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
				account_guid: $scope.entry.bill_account.guid,
				quantity: $scope.entry.quantity,
				price: $scope.entry.bill_price,
			};

			Entry.update(guid, params).then(function(entry) {
				
				for (var i = 0; i < bill.entries.length; i++) {
					if (bill.entries[i].guid == entry.guid) {
						bill.entries[i] = entry;
					}
				}

				bill = Bill.recalculate(bill);
				
				$scope.entryError = '';
				$uibModalInstance.close(bill);	

				// do we actually need to clear these?
				$scope.entry.guid = '';
				$scope.entry.date = '';
				$scope.entry.description = '';
				$scope.entry.inv_account.guid = '';
				$scope.entry.quantity = '';
				$scope.entry.inv_price = '';

			}, function(data) {
				// This doesn't seem to be passing through any other data e.g request status - also do we need to get this into core.handleErrors ?
				if(typeof data.errors != 'undefined') {
					$scope.entryError = data.errors[0].message;
				} else {
					console.log(data);
					console.log(status);	
				}
			});

		}
	}

}]);