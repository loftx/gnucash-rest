angular.module('core', ['core.account']);

angular.module('core').factory('Api', function($timeout, $location, $uibModal) {
	var obj = {

		getUrl: function () {
			if (localStorage.getItem('url') == null) {
				return '/api';
			} else {
				return localStorage.getItem('url');
			}
		},

		getHeaders: function () {
			if (localStorage.getItem('headers') == null) {
				return {};
			} else {
				return JSON.parse(localStorage.getItem('headers'));
			}
		},
		
		handleErrors: function (data, status, type, redirect) {
			if (status == 0 && data == '') {
				$timeout(function(){
					alert('Possible cross domain call - check CORS headers.');
				});
			} else if (status == 400 && typeof data != 'undefined') {
				if (data.errors[0] != 'undefined') {
					if (data.errors[0].type == 'SessionDoesNotExist') {
						var popup = $uibModal.open({
							templateUrl: 'partials/session/fragments/form.html',
							controller: 'modalStartSessionCtrl',
							size: 'sm',
							resolve: {
								error: function () {
								  return data.errors[0].message;
								}
							}
						});
					} else {
						// alert is a sync function and causes '$digest already in progress' if not wrapped in a timeout
						// need to define timeout
						$timeout(function(){
							alert(data.errors[0].message);
						});
					}
				} else {
					console.log('status: ' + status);
					console.log('data: ' + data);
					$timeout(function(){
						alert('Unexpected error - see console for details');
					});
				}
			} else if (status == 404) {
				$timeout(function(){
					if (redirect != undefined) {
						$location.path('/' + redirect);
					}
					alert('This ' + type + ' does not exist');
				});
			} else {
				console.log('status: ' + status);
					console.log('data: ' + data);
				$timeout(function(){
					alert('Unexpected error - see console for details');
				});
			}
		}
	}

	return obj;
});

angular.module('core').factory('Money', function($timeout, $location) {
	var obj = {

		currencys: function() {
			return [
				{key: 'GBP', value: 'GBP'},
				{key: 'USD', value: 'USD'},
				{key: 'EUR', value: 'EUR'}
			];
		},

		formatMoney: function(n, c, d, t) {
			c = isNaN(c = Math.abs(c)) ? 2 : c, 
			d = d == undefined ? "." : d, 
			t = t == undefined ? "," : t, 
			s = n < 0 ? "-" : "", 
			i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
			j = (j = i.length) > 3 ? j % 3 : 0;
		   return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
		},

		format_discount_type: function (discount_type, currency) {
			if (discount_type == 1) {
				return obj.format_currency_format(currency);
			} else if (discount_type == 2) {
				return '%';
			}
		},

		format_currency_format: function(currency) {
			if (currency == 'GBP') {
				return '£';
			} else if (currency == 'USD') {
				return '$';
			} else {
				return currency + ' ';
			}
		},

		format_currency: function(type_id, currency, amount) {
			if (amount < 0) {
				return '-' + obj.format_currency_format(currency) + obj.formatMoney(-amount, 2, '.', ',');
			} else {
				return obj.format_currency_format(currency) + obj.formatMoney(amount, 2, '.', ',');
			}
		}

	}

	return obj;
});

angular.module('core').factory('Dates', function($timeout, $location) {
	var obj = {

		dateFormat: function(str) {
			if (str != null) {
				var d = new Date(str.substring(0,4) + '-' + str.substring(5,7) + '-' + str.substring(8,10));
				return obj.pad(d.getDate()) + '/' + obj.pad(d.getMonth() + 1) + '/' + d.getFullYear();
			} else {
				return '';
			}
		},

		dateInput: function(date) {
				return date.getFullYear() + '-' + obj.pad(date.getMonth() + 1) + '-' + obj.pad(date.getDate());
		},

		dateOutput: function(str) {
			return new Date(str.substring(0,4) + '-' + str.substring(5,7) + '-' + str.substring(8,10));
		},

		pad: function(number) {
			if (number<=99) { number = ("00"+number).slice(-2); }
			return number;
		},

		format_todays_date: function() {
			var today = new Date();
			var dd = today.getDate();
			var mm = today.getMonth()+1; //January is 0!
			var yyyy = today.getFullYear();

			if(dd<10) {
				dd='0'+dd;
			} 

			if(mm<10) {
				mm='0'+mm;
			} 

			today = yyyy + '-' + mm + '-' + dd;
			return today;
		},

		todays_date: function() {
			var d = new Date();
			d.setHours(0,0,0,0);
			return d;
		},

	}

	return obj;
});