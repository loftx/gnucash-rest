function BillListCtrl($scope, $http, $timeout) {

	$scope.date_type = 'opened';
	$scope.date_from = Date.today().add(-3).months().toString('yyyy-MM-dd');
	$scope.date_to = '';
	$scope.is_paid = '';
	$scope.is_active = 1;

	var lastParams = '';

	$scope.$on('$viewContentLoaded', function() {
		$('#billDateFrom').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});

		$('#billDateTo').datepicker({
			'dateFormat': 'yy-mm-dd',
			'onSelect': function(dateText) {
				if (window.angular && angular.element) {
					angular.element(this).controller("ngModel").$setViewValue(dateText);
				}
			}
		});
	});

	$scope.change = function() {

		var params = '';

		if(/[0-9]{4}-[0-9]{2}-[0-9]{2}/i.test($scope.date_from)) {
			if (params != '') {
				params = params + '&';
			}
			params = params + 'date_' + $scope.date_type + '_from=' + $scope.date_from;
		}

		if(/[0-9]{4}-[0-9]{2}-[0-9]{2}/i.test($scope.date_to)) {
			if (params != '') {
				params = params + '&';
			}
			params = params + 'date_' + $scope.date_type + '_to=' + $scope.date_to;
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