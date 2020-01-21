Gnucash Rest
============

A Python based REST framework for the Gnucash accounting application

This project is designed to allow other applications to easily extract data from Gnucash via a RESTful API.

The API is built on the existing Python bindings and uses the Flask framework via WSGI to serve responses in JSON.

Currently accounts, transactions, splits, customers, vendors, invoices and
bills can be accessed to some degree via the framework:

Accounts
--------

GET request to /accounts - returns a complete list of accounts  
GET request to /accounts/&lt;guid&gt; - returns an individual account  
GET request to /accounts/&lt;guid&gt;/splits - returns splits for an individual account

POST request to /transactions - creates a new transaction (currently with only two splits)

POST variables:  
currency  - required - a gnucash currency code e.g. GBP  
description - required - a description for the transaction  
num - optional - a transaction number  
date_posted - required - a date formatted as YYYY-MM-DD  
splitvalue1 - required - the value of the split on splitaccount1   
splitaccount1 - required - the GUID for the 1st account on this transaction (can be obtained from /accounts)  
splitvalue2 - required - the value of the split on splitaccount2  
splitaccount2 - required - the GUID for the 2nd account on this transaction  

GET request to /transactions/&lt;guid&gt; - returns an individual transaction   
POST request to /transactions/&lt;guid&gt; - edits an existing transaction (accepts the same post variables as /transactions)  
DELETE request to /transactions/&lt;guid&gt; - deletes a transaction  

Bills
-----

GET request to /bills - returns a list of bills

GET variables:  
is_paid - optional - 1 returns paid bills, 0 unpaid  
is_active  - optional - 1 returns active bills, 0 inactive  
date_opened_from - optional - all transactions on and after a date formatted as YYYY-MM-DD  
date_opened_to - optional - all transactions up to and before a date formatted as YYYY-MM-DD  

POST request to /bills - creates a new bill

POST variables:  
id - optional - if no id is specified the next available sequential id will be used  
vendor_id - required - the id of the vendor of this bill (can be obtained from /vendors)  
currency - required - a gnucash currency code  
date_opened - required - a date formatted as YYYY-MM-DD  
notes - optional - notes for this bill  

GET request to /bills/&lt;id&gt; - returns an individual bill  
POST request to /bills/&lt;id&gt; - edits (and optionally posts) a bill

POST variables:  
vendor_id - required - the id of the vendor of this bill (can be obtained from /vendors)  
currency - required - a gnucash currency code  
date_opened - a date formatted as YYYY-MM-DD  
notes - optional -  notes for this invoice  
posted - optional - set to 1 if marking the invoice as posted (0 or empty otherwise)  
posted_account_guid - required if posted = 1 - the GUID for the posted account  
posted_date - required if posted = 1 - a date formatted as YYYY-MM-DD  
due_date - required if posted = 1 - a date formatted as YYYY-MM-DD  
posted_memo - optional - a description  
posted_accumulatesplits - optional - whether to accumulate splits or not (1 for yes, 0 for no)  
posted_autopay - optional - whether to auto pay or not (1 for yes, 0 for no)

PAY request to /bills/&lt;id&gt; - mark a bill as paid

POST variables:  
posted_account_guid - required - the GUID for the posted account  
transfer_account_guid - required - the GUID for the transfer account  
payment_date - required - a date formatted as YYYY-MM-DD  
num - optional - a number for this payment  
memo - optional - a description for this payment  
auto_pay - required - whether to auto pay or not (1 for yes, 0 for no)  

GET request to /bills/&lt;id&gt;/entries  - return all entries for an individual bill  
POST request to /bills/&lt;id&gt;/entries - adds a new entry to a bill

date - required -  a date formatted as YYYY-MM-DD  
description  - required -   the description for this entry  
account_guid  - required -  the GUID for the required account  
quantity - required - the quantity  
price - required -  the price  

Invoices
--------

GET request to /invoices - returns all invoices (accepts the same get variables as /bills)  
POST request to /invoices - creates a new invoice

POST variables:  
id - optional - if no id is specified the next available sequential id will be used  
customer_id - required - the id of the customer of this invoice (can be obtained from /customers)  
currency - required - a gnucash currency code  
date_opened - a date formatted as YYYY-MM-DD  
notes - optional -  notes for this invoice  

GET request to /invoices/&lt;id&gt; - returns an individual invoice  
POST request to /invoices/&lt;id&gt; - edits (and optionally posts) an invoice

POST variables:  
customer_id - required - the id of the customer of this bill (can be obtained from /customers)  
currency - required - a gnucash currency code  
date_opened - a date formatted as YYYY-MM-DD  
notes - optional -  notes for this invoice 
posted - optional - set to 1 if marking the invoice as posted (0 or empty otherwise)  
posted_account_guid - required if posted = 1 - the GUID for the posted account  
posted_date - required if posted = 1 - a date formatted as YYYY-MM-DD  
due_date - required if posted = 1 - a date formatted as YYYY-MM-DD  
posted_memo - optional - a description  
posted_accumulatesplits - optional - whether to accumulate splits or not (1 for yes, 0 for no)  
posted_autopay - optional - whether to auto pay or not (1 for yes, 0 for no)  

PAY request to /invoices/&lt;id&gt; - mark an invoice as paid (accepts the same post variables as /bills/&lt;id&gt;)

GET request to /invoices/&lt;id&gt;/entries - return all entries for an individual invoice  
POST request to /invoices/&lt;id&gt;/entries - adds a new entry to an  invoice (accepts the same post variables as /bills/&lt;id&gt;/entries)

GET request to /entries/&lt;guid&gt; - returns an individual entry   
POST request to /entries/&lt;guid&gt; - edits an existing entry (accepts the same post variables as /bills/&lt;id&gt;/entries)

Customers
---------

GET request to /customers - returns a list of customers  
POST request to /customers - creates a new customer

POST variables:  
id - optional - if no id is specified the next available sequential id will be used  
currency - required - a gnucash currency code  
name - required - the customer's name  
contact - optional - a contact for this customer  
address_line_1 - required - the first line of the customer's address  
address_line_2 - optional - the second line of the customer's address  
address_line_3 - optional - the third line of the customer's address  
address_line_4 - optional - the fourth line of the customer's address  
phone - optional - the customer's phone number  
fax - optional - the customer's fax number  
email - optional - the customer's email address  

GET request to /customers/&lt;id&gt; - returns an individual customer  
POST request to /customers/&lt;id&gt; - edits an existing customer (accepts the same post variables as /customers)  
GET request to /customers/&lt;id&gt;/invoices - returns all invoices for a single customer

Vendors
-------

GET request to /vendors - returns a list of vendors  
POST request to /vendors - creates a new vendor

POST variables:  
id - optional - if no id is specified the next available sequential id will be used  
currency - required - a gnucash currency code  
name - required - the vendor's name  
contact - optional - a contact for this vendor  
address_line_1 - required - the first line of the vendor's address  
address_line_2 - optional - the second line of the vendor's address  
address_line_3 - optional - the third line of the vendor's address  
address_line_4 - optional - the fourth line of the vendor's address  
phone - optional - the vendor's phone number  
fax - optional - the vendor's fax number  
email - optional - the vendor's email address  

GET request to /vendors/&lt;id&gt; - returns an individual vendor  
GET request to /vendors/&lt;id&gt;/bills - returns all bills for a single vendor

Requirements

The majority of the functionality in the Rest API is available in recent Gnucash versions but to ensure full compatiblity you may want to build Gnucash from source using the latest maintenance branch <https://github.com/Gnucash/gnucash/tree/maint/> following instructions at https://wiki.gnucash.org/wiki/Building.

Should you not wish to build from source, the API should run (but not all functions may work) from around Gnucash 3.6 onwards with the Python bindings.

You'll also need Flask installed.

Usage
-----

To quickly test the API backend run the following:

	git clone https://github.com/loftx/gnucash-rest.git
	python3 gnucash-rest/gnucash_rest/__init__.py

Then visit http://127.0.0.1:5000/ which should display: "Gnucash REST API"

The host and  port may be changes with the --host and --port flags respectively

Production usage
----------------

Full details to be provided at a later date, but in short you'll need a recent copy of Gnucash (3.6 onwards) built with Python bindings and the Flask module installed and a web server supporting WSGI.

A sample Apache configuration is as follows:

```
<VirtualHost *:80>
        DocumentRoot /path/to/gnucash_rest/www/
        WSGIScriptAlias /api /path/to/gnucash_rest.wsgi
        WSGIProcessGroup wsgi
        WSGIDaemonProcess wsgi user=wsgi group=wsgi display-name=%{GROUP}

        <Directory /path/to/gnucash_rest/www/>
                Order allow,deny
                Allow from all
        </Directory>
</VirtualHost>
```

The application.connection_string variable in gnucash_rest.wsgi should be updated to your Gnucash database e.g:

`application.connection_string = 'mysql://user:password@localhost/gnucash'`

Navigate to <http://localhost/api/invoices> and you should get your invoices
in JSON format.

Files
-----

`gnucash_rest.wsgi` - The WSGI configuration file to serve the application

`gnucash_rest/__init__.py` - The Flask app which responds to REST requests with JSON responses

`gnucash_rest/gnucash_simple.py` - A helper file to convert Gnucash objects into dictionaries for easier conversion to JSON.

Future
------

I'm using the API already to integrate Gnucash invoices with other systems, so I'll be adding features as and when I need them. The format of the API is likely to change as development continues.


Any questions or comments please email <dev@loftx.co.uk>.
