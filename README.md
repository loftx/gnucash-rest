gnucash-rest
============

A Python based REST framework for the Gnucash accounting application

**Please note this is a very early work in progress and should not be run against live or production data. **

This project is designed to allow other applications to easily extract (and hopefully insert and update at some point) data from Gnucash via a RESTful API.

The API is built on the existing Python bindings and uses Flask to serve responses in JSON.

Currently only customers and invoices can be accessed via the framework

Invoices: http://localhost:5000/invoices
Individual invoice: http://localhost:5000/invoices/XXXX

Customers: http://localhost:5000/customers
Individual customer: http://localhost:5000/customers/XXXX

Invoices can be filtered via the following parameters:

is_active 1 or 0
is_paid 1 or 0

e.g. http://localhost:5000/invoices?is_active=1&is_paid=0

Usage
-----

**As this is work in progress you'll need a knowledge of building Gnucash from source and experience with python.**

Full details to be provided at a later date, but in short you'll need a copy of Gnucash (at least 2.4) built with Python bindings and the Flask module installed.

You'll need to update the connection strings to Gnucash in `gnucash.Session()` and run `python ./gnucash_rest` to start the server on http://localhost:5000

Navigate to http://localhost:5000/invoices/XXXX and you should get your invoice in JSON format.

Files
-----

`gnucash_rest.py` - The Flask app which responds to REST requests with JSON responses

`gnucash_simple.py` - A helper file to convert Gnucash objects into dictionaries for easier conversion to JSON.

`gnucash_core_c.py` - Changes to the Gnucash core files (some hooks are still in `gnucash_rest.py`)

Future
------

I'm using the API already to integrate Gnucash invoices with other systems, so I'll be adding features as and when I need them. The format of the API is likely to change as development continues

Any questions or comments please email dev@loftx.co.uk
