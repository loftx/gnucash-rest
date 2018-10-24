#!/usr/bin/python

'''

gnucash_rest.py -- A Flask app which responds to REST requests
with JSON responses

Copyright (C) 2013 Tom Lofts <dev@loftx.co.uk>

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License as
published by the Free Software Foundation; either version 2 of
the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, contact:

Free Software Foundation Voice: +1-617-542-5942
51 Franklin Street, Fifth Floor Fax: +1-617-542-2652
Boston, MA 02110-1301, USA gnu@gnu.org

@author Tom Lofts <dev@loftx.co.uk>

'''

import gnucash
import gnucash_simple
import json
import atexit
from functools import wraps
from flask import Flask, abort, request, Response, g
import re
import sys

# to resolve bug in http://stackoverflow.com/questions/2427240/thread-safe-equivalent-to-pythons-time-strptime
import _strptime
import datetime

from decimal import Decimal

from gnucash.gnucash_business import Vendor, Bill, Entry, GncNumeric, \
    Customer, Invoice, Split, Account, Transaction

# not actually used - only used on frontend so far
# from gnucash.gnucash_business import \
#     GNC_DISC_PRETAX, \
#     GNC_DISC_SAMETIME, \
#     GNC_DISC_POSTTAX

from gnucash.gnucash_business import \
    GNC_AMT_TYPE_VALUE, \
    GNC_AMT_TYPE_PERCENT

from gnucash import \
    QOF_QUERY_AND, \
    QOF_QUERY_OR, \
    QOF_QUERY_NAND, \
    QOF_QUERY_NOR, \
    QOF_QUERY_XOR

from gnucash import \
    QOF_STRING_MATCH_NORMAL, \
    QOF_STRING_MATCH_CASEINSENSITIVE

from gnucash import \
    QOF_COMPARE_LT, \
    QOF_COMPARE_LTE, \
    QOF_COMPARE_EQUAL, \
    QOF_COMPARE_GT, \
    QOF_COMPARE_GTE, \
    QOF_COMPARE_NEQ

from gnucash import \
    INVOICE_TYPE

from gnucash import \
    INVOICE_IS_PAID
   
from gnucash.gnucash_core_c import \
    GNC_INVOICE_CUST_INVOICE, \
    GNC_INVOICE_VEND_INVOICE

# define globals
session = None

# start application
app = Flask(__name__)

@app.before_first_request
def _run_on_start():
    startup()
    # register method to close gnucash connection gracefully
    atexit.register(shutdown)

@app.after_request
def after_request(response):
    if hasattr(app, 'cors_origin') and app.cors_origin != '':
        header = response.headers
        header['Access-Control-Allow-Methods'] = 'GET,OPTIONS,POST,DELETE,PAY'
        header['Access-Control-Allow-Origin'] = app.cors_origin
        header['Access-Control-Allow-Headers'] = 'Access-Control-Allow-Headers,Origin,Accept,X-Requested-With,Content-Type,Access-Control-Request-Method,Access-Control-Request-Headers,Authorization'

    return response

@app.route('/', methods=['GET'])
#@requires_auth
def api_root():
    return Response(json.dumps('Gnucash REST API'), status=201,
        mimetype='application/json')

@app.route('/session', methods=['POST', 'DELETE'])
def api_session():

    if request.method == 'POST':

        connection_string = str(request.form.get('connection_string', ''))
        is_new = str(request.form.get('is_new', ''))
        ignore_lock = str(request.form.get('ignore_lock', ''))

        try:
            start_session(connection_string, is_new, ignore_lock)
        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400,
                mimetype='application/json')
        else:
            return Response(json.dumps('Session started'), status=201,
                mimetype='application/json')

    elif request.method == 'DELETE':

        try:
            end_session()
        except Error as error:
            # some of these errors may be status 500?
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400,
                mimetype='application/json')
        else:
            return Response(json.dumps('Session ended'), status=200,
                mimetype='application/json')

@app.route('/accounts', methods=['GET', 'POST'])
def api_accounts():

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    if request.method == 'GET':

        accounts = get_accounts(session.book)

        return Response(json.dumps(accounts), mimetype='application/json')

    elif request.method == 'POST':

        name = str(request.form.get('name', ''))
        currency = str(request.form.get('currency', ''))
        account_type_id = sint(request.form.get('account_type_id', 0))
        parent_account_guid = str(request.form.get('parent_account_guid', ''))

        try:
            account = add_account(session.book, name, currency, account_type_id, parent_account_guid)
        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400,
                mimetype='application/json')
        else:
            return Response(json.dumps(account), status=201,
                mimetype='application/json')

@app.route('/accounts/<guid>', methods=['GET'])
def api_account(guid):

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    account = get_account(session.book, guid)
    
    if account is None:
        abort(404)
    else:
        return Response(json.dumps(account), mimetype='application/json')

@app.route('/accounts/<guid>/splits', methods=['GET'])
def api_account_splits(guid):

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    date_posted_from = request.args.get('date_posted_from', None)
    date_posted_to = request.args.get('date_posted_to', None)

    # check account exists
    account = get_account(session.book, guid)

    if account is None:
        abort(404)

    try:
        splits = get_account_splits(session.book, guid, date_posted_from,
        date_posted_to)
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')
 
    return Response(json.dumps(splits), mimetype='application/json')

@app.route('/transactions', methods=['POST'])
def api_transactions():

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    if request.method == 'POST':
        
        currency = str(request.form.get('currency', ''))
        description = str(request.form.get('description', ''))
        num = str(request.form.get('num', ''))
        date_posted = str(request.form.get('date_posted', ''))

        splits = []

        # loop over all fields, extract splitvalues assign matching splitaccount should one exist
        for field in request.form:
            if field[:10] == 'splitvalue':
                splitvalue = str(request.form.get('splitvalue' + field[10:], ''))
                if 'splitaccount' + field[10:] in request.form:
                    splitaccount = str(request.form.get('splitaccount' + field[10:], ''))
                else:
                    splitaccount = ''
                splits.append({'value': splitvalue, 'account_guid': splitaccount})

        try:
            transaction = add_transaction(session.book, num, description,
                date_posted, currency, splits)
        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400,
                mimetype='application/json')
        else:
            return Response(json.dumps(transaction), status=201,
                mimetype='application/json')

@app.route('/transactions/<guid>', methods=['GET', 'POST', 'DELETE'])
def api_transaction(guid):

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    if request.method == 'GET':

        transaction = get_transaction(session.book, guid)

        if transaction is None:
            abort(404)
        
        return Response(json.dumps(transaction), mimetype='application/json')

    elif request.method == 'POST':

        currency = str(request.form.get('currency', ''))
        description = str(request.form.get('description', ''))
        num = str(request.form.get('num', ''))
        date_posted = str(request.form.get('date_posted', ''))

        splits = []

        # loop over all fields, extract splitguids and assign matching splitvalues and splitaccount should they exist
        for field in request.form:
            if field[:9] == 'splitguid':
                splitguid = str(request.form.get('splitguid' + field[9:], ''))
                if 'splitvalue' + field[9:] in request.form:
                    splitvalue = str(request.form.get('splitvalue' + field[9:], ''))
                else:
                    splitvalue = ''
                if 'splitaccount' + field[9:] in request.form:
                    splitaccount = str(request.form.get('splitaccount' + field[9:], ''))
                else:
                    splitaccount = ''
                splits.append({'guid': splitguid, 'value': splitvalue, 'account_guid': splitaccount})

        try:
            transaction = edit_transaction(session.book, guid, num, description,
                date_posted, currency, splits)
        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400, mimetype='application/json')
        else:
            return Response(json.dumps(transaction), status=200,
                mimetype='application/json')

    elif request.method == 'DELETE':
        try:
            delete_transaction(session.book, guid)
        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400, mimetype='application/json')
        else:
            return Response('', status=200, mimetype='application/json')    

@app.route('/bills', methods=['GET', 'POST'])
def api_bills():

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    if request.method == 'GET':
        
        is_paid = request.args.get('is_paid', None)
        is_active = request.args.get('is_active', None)
        date_opened_to = request.args.get('date_opened_to', None)
        date_opened_from = request.args.get('date_opened_from', None)
        date_due_to = request.args.get('date_due_to', None)
        date_due_from = request.args.get('date_due_from', None)
        date_posted_to = request.args.get('date_posted_to', None)
        date_posted_from = request.args.get('date_posted_from', None)

        if is_paid == '1':
            is_paid = 1
        elif is_paid == '0':
            is_paid = 0
        else:
            is_paid = None

        if is_active == '1':
            is_active = 1
        elif is_active == '0':
            is_active = 0
        else:
            is_active = None

        try:
            bills = get_bills(session.book, {
                'is_paid': is_paid,
                'is_active': is_active,
                'date_opened_from': date_opened_from,
                'date_opened_to': date_opened_to,
                'date_due_from': date_due_from,
                'date_due_to': date_due_to,
                'date_posted_from': date_posted_from,
                'date_posted_to': date_posted_to,
            })

        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}),
                status=400, mimetype='application/json')
        
        return Response(json.dumps(bills), mimetype='application/json')

    elif request.method == 'POST':

        id = str(request.form.get('id', ''))

        if id == '':
            id = None

        vendor_id = str(request.form.get('vendor_id', ''))
        currency = str(request.form.get('currency', ''))
        date_opened = str(request.form.get('date_opened', ''))
        notes = str(request.form.get('notes', ''))

        try:
            bill = add_bill(session.book, id, vendor_id, currency, date_opened,
                notes)
        except Error as error:
            # handle incorrect parameter errors
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400, mimetype='application/json')
        else:
            return Response(json.dumps(bill), status=201,
                mimetype='application/json')

@app.route('/bills/<id>', methods=['GET', 'POST', 'PAY'])
def api_bill(id):

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    if request.method == 'GET':

        bill = get_bill(session.book, id)
        
        if bill is None:
            abort(404)
        else:
            return Response(json.dumps(bill), mimetype='application/json')

    elif request.method == 'POST':

        vendor_id = str(request.form.get('vendor_id', ''))
        currency = str(request.form.get('currency', ''))
        date_opened = request.form.get('date_opened', '')
        notes = str(request.form.get('notes', ''))
        posted = request.form.get('posted', '')
        posted_account_guid = str(request.form.get('posted_account_guid', ''))
        posted_date = request.form.get('posted_date', '')
        due_date = request.form.get('due_date', '')
        posted_memo = str(request.form.get('posted_memo', ''))
        posted_accumulatesplits = request.form.get('posted_accumulatesplits',
            '')
        posted_autopay = request.form.get('posted_autopay', '')

        if posted == '1':
            posted = 1
        else:
            posted = 0

        if (posted_accumulatesplits == '1'
            or posted_accumulatesplits == 'true'
            or posted_accumulatesplits == 'True'
            or posted_accumulatesplits == True):
            posted_accumulatesplits = True
        else:
            posted_accumulatesplits = False

        if posted_autopay == '1':
            posted_autopay = True
        else:
            posted_autopay = False
        try:
            bill = update_bill(session.book, id, vendor_id, currency,
                date_opened, notes, posted, posted_account_guid, posted_date,
                due_date, posted_memo, posted_accumulatesplits, posted_autopay)
        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400,
                mimetype='application/json')
        else:
            return Response(json.dumps(bill), status=200,
                mimetype='application/json')

        if bill is None:
            abort(404)
        else:
            return Response(json.dumps(bill),
                mimetype='application/json')

    elif request.method == 'PAY':
        
        posted_account_guid = str(request.form.get('posted_account_guid', ''))
        transfer_account_guid = str(request.form.get('transfer_account_guid',
            ''))
        payment_date = request.form.get('payment_date', '')
        num = str(request.form.get('num', ''))
        memo = str(request.form.get('posted_memo', ''))
        auto_pay = request.form.get('auto_pay', '')

        try:
            bill = pay_bill(session.book, id, posted_account_guid,
                transfer_account_guid, payment_date, memo, num, auto_pay)
        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')
        else:
            return Response(json.dumps(bill), status=200,
                mimetype='application/json')

@app.route('/bills/<id>/entries', methods=['GET', 'POST'])
def api_bill_entries(id):

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    bill = get_bill(session.book, id)
    
    if bill is None:
        abort(404)
    else:
        if request.method == 'GET':
            return Response(json.dumps(bill['entries']), mimetype='application/json')
        elif request.method == 'POST':

            date = str(request.form.get('date', ''))
            description = str(request.form.get('description', ''))
            account_guid = str(request.form.get('account_guid', ''))
            quantity = str(request.form.get('quantity', ''))
            price = str(request.form.get('price', ''))

            try:
                entry = add_bill_entry(session.book, id, date, description,
                    account_guid, quantity, price)
            except Error as error:
                return Response(json.dumps({'errors': [{'type' : error.type,
                    'message': error.message, 'data': error.data}]}),
                    status=400, mimetype='application/json')
            else:
                return Response(json.dumps(entry), status=201,
                    mimetype='application/json')

@app.route('/invoices', methods=['GET', 'POST'])
def api_invoices():

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    if request.method == 'GET':
        
        is_paid = request.args.get('is_paid', None)
        is_active = request.args.get('is_active', None)
        date_due_from = request.args.get('date_due_from', None)
        date_due_to = request.args.get('date_due_to', None)
        date_opened_from = request.args.get('date_opened_from', None)
        date_opened_to = request.args.get('date_opened_to', None)
        date_posted_from = request.args.get('date_posted_from', None)
        date_posted_to = request.args.get('date_posted_to', None)

        if is_paid == '1':
            is_paid = 1
        elif is_paid == '0':
            is_paid = 0
        else:
            is_paid = None

        if is_active == '1':
            is_active = 1
        elif is_active == '0':
            is_active = 0
        else:
            is_active = None

        try:
            invoices = get_invoices(session.book, {
                'is_paid': is_paid,
                'is_active': is_active,
                'date_opened_from': date_opened_from,
                'date_opened_to': date_opened_to,
                'date_due_from': date_due_from,
                'date_due_to': date_due_to,
                'date_posted_from': date_posted_from,
                'date_posted_to': date_posted_to,
            })
        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}),
                status=400, mimetype='application/json')

        return Response(json.dumps(invoices), mimetype='application/json')

    elif request.method == 'POST':

        id = str(request.form.get('id', ''))

        if id == '':
            id = None

        customer_id = str(request.form.get('customer_id', ''))
        currency = str(request.form.get('currency', ''))
        date_opened = str(request.form.get('date_opened', ''))
        notes = str(request.form.get('notes', ''))

        try:
            invoice = add_invoice(session.book, id, customer_id, currency,
                date_opened, notes)
        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400,
                mimetype='application/json')
        else:
            return Response(json.dumps(invoice), status=201,
                mimetype='application/json')

@app.route('/invoices/<id>', methods=['GET', 'POST', 'PAY'])
def api_invoice(id):

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    if request.method == 'GET':

        invoice = get_invoice(session.book, id)
        
        if invoice is None:
            abort(404)
        else:
            return Response(json.dumps(invoice), mimetype='application/json')

    elif request.method == 'POST':

        customer_id = str(request.form.get('customer_id', ''))
        currency = str(request.form.get('currency', ''))
        date_opened = request.form.get('date_opened', '')
        notes = str(request.form.get('notes', ''))
        posted = request.form.get('posted', '')
        posted_account_guid = str(request.form.get('posted_account_guid', ''))
        posted_date = request.form.get('posted_date', '')
        due_date = request.form.get('due_date', '')
        posted_memo = str(request.form.get('posted_memo', ''))
        posted_accumulatesplits = request.form.get('posted_accumulatesplits',
            '')
        posted_autopay = request.form.get('posted_autopay', '')

        if posted == '1':
            posted = 1
        else:
            posted = 0

        if (posted_accumulatesplits == '1'
            or posted_accumulatesplits == 'true'
            or posted_accumulatesplits == 'True'
            or posted_accumulatesplits == True):
            posted_accumulatesplits = True
        else:
            posted_accumulatesplits = False

        if posted_autopay == '1':
            posted_autopay = True
        else:
            posted_autopay = False
        try:
            invoice = update_invoice(session.book, id, customer_id, currency,
                date_opened, notes, posted, posted_account_guid, posted_date,
                due_date, posted_memo, posted_accumulatesplits, posted_autopay)
        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400,
                mimetype='application/json')
        else:
            return Response(json.dumps(invoice), status=200,
                mimetype='application/json')

        if invoice is None:
            abort(404)
        else:
            return Response(json.dumps(invoice), mimetype='application/json')

    elif request.method == 'PAY':
        
        posted_account_guid = str(request.form.get('posted_account_guid', ''))
        transfer_account_guid = str(request.form.get('transfer_account_guid',
            ''))
        payment_date = request.form.get('payment_date', '')
        num = str(request.form.get('num', ''))
        memo = str(request.form.get('posted_memo', ''))
        auto_pay = request.form.get('auto_pay', '')

        try:
            invoice = pay_invoice(session.book, id, posted_account_guid,
                transfer_account_guid, payment_date, memo, num, auto_pay)
        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')
        else:
            return Response(json.dumps(invoice), status=200,
                mimetype='application/json')

@app.route('/invoices/<id>/entries', methods=['GET', 'POST'])
def api_invoice_entries(id):

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    invoice = get_invoice(session.book, id)
    
    if invoice is None:
        abort(404)
    else:
        if request.method == 'GET':
            return Response(json.dumps(invoice['entries']),
                mimetype='application/json')
        elif request.method == 'POST':

            # TODO: discount should be checked as numeric / maybe also discount type / date

            date = str(request.form.get('date', ''))
            description = str(request.form.get('description', ''))
            account_guid = str(request.form.get('account_guid', ''))
            quantity = str(request.form.get('quantity', ''))
            price = str(request.form.get('price', ''))
            discount_type = sint(request.form.get('discount_type', 0))
            discount = str(request.form.get('discount', ''))

            try:
                entry = add_entry(session.book, id, date, description,
                    account_guid, quantity, price, discount_type, discount)
            except Error as error:
                return Response(json.dumps({'errors': [{'type' : error.type,
                    'message': error.message, 'data': error.data}]}),
                    status=400, mimetype='application/json')
            else:
                return Response(json.dumps(entry), status=201,
                    mimetype='application/json')

@app.route('/entries/<guid>', methods=['GET', 'POST', 'DELETE'])
def api_entry(guid):

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    entry = get_entry(session.book, guid)
    
    if entry is None:
        abort(404)
    else:
        if request.method == 'GET':
            return Response(json.dumps(entry), mimetype='application/json')
        elif request.method == 'POST':

            # TODO: discount should be checked as numeric / maybe also discount type / date

            date = str(request.form.get('date', ''))
            description = str(request.form.get('description', ''))
            account_guid = str(request.form.get('account_guid', ''))
            quantity = str(request.form.get('quantity', ''))
            price = str(request.form.get('price', ''))

            # Bills won't provide a discount_type or discount field
            if 'discount_type' in request.form:
                discount_type = sint(request.form.get('discount_type', 0))
            else:
                discount_type = None

            if 'discount' in request.form:    
                discount = str(request.form.get('discount', ''))
            else:
                discount = None

            try:
                entry = update_entry(session.book, guid, date, description,
                    account_guid, quantity, price, discount_type, discount)
            except Error as error:
                return Response(json.dumps({'errors': [{'type' : error.type,
                    'message': error.message, 'data': error.data}]}),
                    status=400, mimetype='application/json')
            else:
                return Response(json.dumps(entry), status=200,
                    mimetype='application/json')

        elif request.method == 'DELETE':

            delete_entry(session.book, guid)

            return Response('', status=200, mimetype='application/json')

@app.route('/customers', methods=['GET', 'POST'])
def api_customers():

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    if request.method == 'GET':
        customers = get_customers(session.book)
        return Response(json.dumps(customers), mimetype='application/json')
    elif request.method == 'POST':

        id = str(request.form.get('id', ''))

        if id == '':
            id = None

        currency = str(request.form.get('currency', ''))
        name = str(request.form.get('name', ''))
        contact = str(request.form.get('contact', ''))
        address_line_1 = str(request.form.get('address_line_1', ''))
        address_line_2 = str(request.form.get('address_line_2', ''))
        address_line_3 = str(request.form.get('address_line_3', ''))
        address_line_4 = str(request.form.get('address_line_4', ''))
        phone = str(request.form.get('phone', ''))
        fax = str(request.form.get('fax', ''))
        email = str(request.form.get('email', ''))

        try:
            customer = add_customer(session.book, id, currency, name, contact,
                address_line_1, address_line_2, address_line_3, address_line_4,
                phone, fax, email)
        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400,
                mimetype='application/json')
        else:
            return Response(json.dumps(customer), status=201,
                mimetype='application/json')

@app.route('/customers/<id>', methods=['GET', 'POST'])
def api_customer(id):

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    if request.method == 'GET':

        customer = get_customer(session.book, id)

        if customer is None:
            abort(404)
        else:
            return Response(json.dumps(customer), mimetype='application/json')

    elif request.method == 'POST':

        if id == '':
            id = str(request.form.get('id', ''))
            if id == '':
                id = None

        name = str(request.form.get('name', ''))
        contact = str(request.form.get('contact', ''))
        address_line_1 = str(request.form.get('address_line_1', ''))
        address_line_2 = str(request.form.get('address_line_2', ''))
        address_line_3 = str(request.form.get('address_line_3', ''))
        address_line_4 = str(request.form.get('address_line_4', ''))
        phone = str(request.form.get('phone', ''))
        fax = str(request.form.get('fax', ''))
        email = str(request.form.get('email', ''))

        try:
            customer = update_customer(session.book, id, name, contact,
                address_line_1, address_line_2, address_line_3, address_line_4,
                phone, fax, email)
        except Error as error:
            if error.type == 'NoCustomer':
                return Response(json.dumps({'errors': [{'type' : error.type,
                    'message': error.message, 'data': error.data}]}),
                    status=404, mimetype='application/json')
            else:
                return Response(json.dumps({'errors': [{'type' : error.type,
                    'message': error.message, 'data': error.data}]}),
                    status=400, mimetype='application/json')
        else:
            return Response(json.dumps(customer), status=200,
                mimetype='application/json')

@app.route('/customers/<id>/invoices', methods=['GET'])
def api_customer_invoices(id):

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    customer = get_customer(session.book, id)
    
    if customer is None:
        abort(404)


    is_paid = request.args.get('is_paid', None)
    is_active = request.args.get('is_active', None)
    date_due_from = request.args.get('date_due_from', None)
    date_due_to = request.args.get('date_due_to', None)
    date_opened_from = request.args.get('date_opened_from', None)
    date_opened_to = request.args.get('date_opened_to', None)
    date_posted_from = request.args.get('date_posted_from', None)
    date_posted_to = request.args.get('date_posted_to', None)

    if is_paid == '1':
        is_paid = 1
    elif is_paid == '0':
        is_paid = 0
    else:
        is_paid = None

    if is_active == '1':
        is_active = 1
    elif is_active == '0':
        is_active = 0
    else:
        is_active = None
    
    try:
        invoices = get_invoices(session.book, {
            'customer': customer['guid'],
            'is_paid': is_paid,
            'is_active': is_active,
            'date_opened_from': date_opened_from,
            'date_opened_to': date_opened_to,
            'date_due_from': date_due_from,
            'date_due_to': date_due_to,
            'date_posted_from': date_posted_from,
            'date_posted_to': date_posted_to,
        })
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}),
            status=400, mimetype='application/json')
    
    return Response(json.dumps(invoices), mimetype='application/json')

@app.route('/vendors', methods=['GET', 'POST'])
def api_vendors():

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    if request.method == 'GET':
        vendors = get_vendors(session.book)
        return Response(json.dumps(vendors), mimetype='application/json')
    elif request.method == 'POST':

        id = str(request.form.get('id', ''))

        if id == '':
            id = None

        currency = str(request.form.get('currency', ''))
        name = str(request.form.get('name', ''))
        contact = str(request.form.get('contact', ''))
        address_line_1 = str(request.form.get('address_line_1', ''))
        address_line_2 = str(request.form.get('address_line_2', ''))
        address_line_3 = str(request.form.get('address_line_3', ''))
        address_line_4 = str(request.form.get('address_line_4', ''))
        phone = str(request.form.get('phone', ''))
        fax = str(request.form.get('fax', ''))
        email = str(request.form.get('email', ''))

        try:
            vendor = add_vendor(session.book, id, currency, name, contact,
                address_line_1, address_line_2, address_line_3, address_line_4,
                phone, fax, email)
        except Error as error:
            return Response(json.dumps({'errors': [{'type' : error.type,
                'message': error.message, 'data': error.data}]}), status=400,
                mimetype='application/json')
        else:
            return Response(json.dumps(vendor), status=201,
                mimetype='application/json')

@app.route('/vendors/<id>', methods=['GET', 'POST'])
def api_vendor(id):

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    if request.method == 'GET':

        vendor = get_vendor(session.book, id)

        if vendor is None:
            abort(404)
        else:
            return Response(json.dumps(vendor), mimetype='application/json')

@app.route('/vendors/<id>/bills', methods=['GET'])
def api_vendor_bills(id):

    # This is almost a copy of /bills

    try:
        session = get_session()
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}), status=400,
            mimetype='application/json')

    vendor = get_vendor(session.book, id)
    
    if vendor is None:
        abort(404)

    is_paid = request.args.get('is_paid', None)
    is_active = request.args.get('is_active', None)
    date_opened_to = request.args.get('date_opened_to', None)
    date_opened_from = request.args.get('date_opened_from', None)
    date_due_to = request.args.get('date_due_to', None)
    date_due_from = request.args.get('date_due_from', None)
    date_posted_to = request.args.get('date_posted_to', None)
    date_posted_from = request.args.get('date_posted_from', None)

    if is_paid == '1':
        is_paid = 1
    elif is_paid == '0':
        is_paid = 0
    else:
        is_paid = None

    if is_active == '1':
        is_active = 1
    elif is_active == '0':
        is_active = 0
    else:
        is_active = None

    try:
        bills = get_bills(session.book, {
            'customer': vendor['guid'],
            'is_paid': is_paid,
            'is_active': is_active,
            'date_opened_from': date_opened_from,
            'date_opened_to': date_opened_to,
            'date_due_from': date_due_from,
            'date_due_to': date_due_to,
            'date_posted_from': date_posted_from,
            'date_posted_to': date_posted_to,
        })
    except Error as error:
        return Response(json.dumps({'errors': [{'type' : error.type,
            'message': error.message, 'data': error.data}]}),
            status=400, mimetype='application/json')
         
    return Response(json.dumps(bills), mimetype='application/json')

def get_customers(book):

    query = gnucash.Query()
    query.search_for('gncCustomer')
    query.set_book(book)
    customers = []

    for result in query.run():
        customers.append(gnucash_simple.customerToDict(
            gnucash.gnucash_business.Customer(instance=result)))

    query.destroy()

    return customers

def get_customer(book, id):

    customer = book.CustomerLookupByID(id)

    if customer is None:
        return None
    else:
        return gnucash_simple.customerToDict(customer)

def get_vendors(book):

    query = gnucash.Query()
    query.search_for('gncVendor')
    query.set_book(book)
    vendors = []

    for result in query.run():
        vendors.append(gnucash_simple.vendorToDict(
            gnucash.gnucash_business.Vendor(instance=result)))

    query.destroy()

    return vendors

def get_vendor(book, id):

    vendor = book.VendorLookupByID(id)

    if vendor is None:
        return None
    else:
        return gnucash_simple.vendorToDict(vendor)

def get_accounts(book):

    accounts = gnucash_simple.accountToDict(book.get_root_account())

    return accounts

def get_account(book, guid):

    account_guid = gnucash.gnucash_core.GUID() 
    gnucash.gnucash_core.GUIDString(guid, account_guid)

    account = account_guid.AccountLookup(book)

    if account is None:
        return None

    account = gnucash_simple.accountToDict(account)

    if account is None:
        return None
    else:
        return account

def get_account_splits(book, guid, date_posted_from, date_posted_to):

    account_guid = gnucash.gnucash_core.GUID() 
    gnucash.gnucash_core.GUIDString(guid, account_guid)

    query = gnucash.Query()
    query.search_for('Split')
    query.set_book(book)

    SPLIT_TRANS= 'trans'

    QOF_DATE_MATCH_NORMAL = 1

    TRANS_DATE_POSTED = 'date-posted'

    if date_posted_from is not None:
        try:
            date_posted_from = datetime.datetime.strptime(date_posted_from, "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDatePostedFrom',
                'The date posted from must be provided in the form YYYY-MM-DD',
                {'field': 'date_posted_from'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_GTE, QOF_DATE_MATCH_NORMAL, date_posted_from.date())
        param_list = [SPLIT_TRANS, TRANS_DATE_POSTED]
        query.add_term(param_list, pred_data, QOF_QUERY_AND)

    if date_posted_to is not None:

        try:
            date_posted_to = datetime.datetime.strptime(date_posted_to, "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDatePostedTo',
                'The date posted to must be provided in the form YYYY-MM-DD',
                {'field': 'date_posted_from'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_LTE, QOF_DATE_MATCH_NORMAL, date_posted_to.date())
        param_list = [SPLIT_TRANS, TRANS_DATE_POSTED]
        query.add_term(param_list, pred_data, QOF_QUERY_AND)
    
    SPLIT_ACCOUNT = 'account'
    QOF_PARAM_GUID = 'guid'

    if guid is not None:
        gnucash.gnucash_core.GUIDString(guid, account_guid)
        query.add_guid_match(
            [SPLIT_ACCOUNT, QOF_PARAM_GUID], account_guid, QOF_QUERY_AND)

    splits = []

    for split in query.run():
        splits.append(gnucash_simple.splitToDict(
            gnucash.gnucash_business.Split(instance=split),
            ['account', 'transaction', 'other_split']))

    query.destroy()

    return splits

# Might be a good idea to pass though these options as properties instead
def get_invoices(book, properties):

    defaults = [
        'customer',
        'is_paid',
        'is_active',
        'date_opened_from',
        'date_opened_to',
        'date_due_to',
        'date_due_from',
        'date_posted_to',
        'date_posted_from'
    ]

    for default in defaults:
        if default not in properties.keys():
            properties[default] = None

    query = gnucash.Query()
    query.search_for('gncInvoice')
    query.set_book(book)

    if properties['is_paid'] == 0:
        query.add_boolean_match([INVOICE_IS_PAID], False, QOF_QUERY_AND)
    elif properties['is_paid'] == 1:
        query.add_boolean_match([INVOICE_IS_PAID], True, QOF_QUERY_AND)

    # active = JOB_IS_ACTIVE
    if properties['is_active'] == 0:
        query.add_boolean_match(['active'], False, QOF_QUERY_AND)
    elif properties['is_active'] == 1:
        query.add_boolean_match(['active'], True, QOF_QUERY_AND)

    QOF_PARAM_GUID = 'guid'
    INVOICE_OWNER = 'owner'

    if properties['customer'] is not None:
        customer_guid = gnucash.gnucash_core.GUID() 
        gnucash.gnucash_core.GUIDString(properties['customer'], customer_guid)
        query.add_guid_match(
            [INVOICE_OWNER, QOF_PARAM_GUID], customer_guid, QOF_QUERY_AND)

    if properties['date_due_from'] is not None:
        try:
            properties['date_due_from'] = datetime.datetime.strptime(properties['date_due_from'], "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDateDueFrom',
                'The date due from to must be provided in the form YYYY-MM-DD',
                {'field': 'date_due_from'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_GTE, 2, properties['date_due_from'].date())
        query.add_term(['date_due'], pred_data, QOF_QUERY_AND)

    if properties['date_due_to'] is not None:
        try:
            properties['date_due_to'] = datetime.datetime.strptime(properties['date_due_to'], "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDateDueTo',
                'The date due from to must be provided in the form YYYY-MM-DD',
                {'field': 'date_due_to'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_LTE, 2, properties['date_due_to'].date())
        query.add_term(['date_due'], pred_data, QOF_QUERY_AND)

    if properties['date_opened_from'] is not None:
        try:
            properties['date_opened_from'] = datetime.datetime.strptime(properties['date_opened_from'], "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDateOpenedFrom',
                'The date due from to must be provided in the form YYYY-MM-DD',
                {'field': 'date_opened_from'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_GTE, 2, properties['date_opened_from'].date())
        query.add_term(['date_opened'], pred_data, QOF_QUERY_AND)

    if properties['date_opened_to'] is not None:
        try:
            properties['date_opened_to'] = datetime.datetime.strptime(properties['date_opened_to'], "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDateOpenedTo',
                'The date due from to must be provided in the form YYYY-MM-DD',
                {'field': 'date_opened_to'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_LTE, 2, properties['date_opened_to'].date())
        query.add_term(['date_opened'], pred_data, QOF_QUERY_AND)

    if properties['date_posted_from'] is not None:
        try:
            properties['date_posted_from'] = datetime.datetime.strptime(properties['date_posted_from'], "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDatePostedFrom',
                'The date due from to must be provided in the form YYYY-MM-DD',
                {'field': 'date_posted_from'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_GTE, 2, properties['date_posted_from'].date())
        query.add_term(['date_posted'], pred_data, QOF_QUERY_AND)

    if properties['date_posted_to'] is not None:
        try:
            properties['date_posted_to'] = datetime.datetime.strptime(properties['date_posted_to'], "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDatePostedTo',
                'The date due from to must be provided in the form YYYY-MM-DD',
                {'field': 'date_posted_to'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_LTE, 2, properties['date_posted_to'].date())
        query.add_term(['date_posted'], pred_data, QOF_QUERY_AND)

    # return only invoices
    pred_data = gnucash.gnucash_core.QueryInt32Predicate(QOF_COMPARE_EQUAL,
        GNC_INVOICE_CUST_INVOICE)
    query.add_term([INVOICE_TYPE], pred_data, QOF_QUERY_AND)

    invoices = []

    for result in query.run():
        invoices.append(gnucash_simple.invoiceToDict(
            gnucash.gnucash_business.Invoice(instance=result)))

    query.destroy()

    return invoices

def get_bills(book, properties):

    # define defaults and set to None
    defaults = [
        'customer',
        'is_paid',
        'is_active',
        'date_opened_from',
        'date_opened_to',
        'date_due_to',
        'date_due_from',
        'date_posted_to',
        'date_posted_from'
    ]

    for default in defaults:
        if default not in properties.keys():
            properties[default] = None

    query = gnucash.Query()
    query.search_for('gncInvoice')
    query.set_book(book)

    if properties['is_paid'] == 0:
        query.add_boolean_match([INVOICE_IS_PAID], False, QOF_QUERY_AND)
    elif properties['is_paid'] == 1:
        query.add_boolean_match([INVOICE_IS_PAID], True, QOF_QUERY_AND)

    # active = JOB_IS_ACTIVE
    if properties['is_active'] == 0:
        query.add_boolean_match(['active'], False, QOF_QUERY_AND)
    elif properties['is_active'] == 1:
        query.add_boolean_match(['active'], True, QOF_QUERY_AND)

    QOF_PARAM_GUID = 'guid'
    INVOICE_OWNER = 'owner'

    if properties['customer'] is not None:
        customer_guid = gnucash.gnucash_core.GUID() 
        gnucash.gnucash_core.GUIDString(properties['customer'], customer_guid)
        query.add_guid_match(
            [INVOICE_OWNER, QOF_PARAM_GUID], customer_guid, QOF_QUERY_AND)

    # These are identical to invoices...

    if properties['date_due_from'] is not None:
        try:
            properties['date_due_from'] = datetime.datetime.strptime(properties['date_due_from'], "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDateDueFrom',
                'The date due from to must be provided in the form YYYY-MM-DD',
                {'field': 'date_due_from'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_GTE, 2, properties['date_due_from'].date())
        query.add_term(['date_due'], pred_data, QOF_QUERY_AND)

    if properties['date_due_to'] is not None:
        try:
            properties['date_due_to'] = datetime.datetime.strptime(properties['date_due_to'], "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDateDueTo',
                'The date due from to must be provided in the form YYYY-MM-DD',
                {'field': 'date_due_to'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_LTE, 2, properties['date_due_to'].date())
        query.add_term(['date_due'], pred_data, QOF_QUERY_AND)

    if properties['date_opened_from'] is not None:
        try:
            properties['date_opened_from'] = datetime.datetime.strptime(properties['date_opened_from'], "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDateOpenedFrom',
                'The date due from to must be provided in the form YYYY-MM-DD',
                {'field': 'date_opened_from'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_GTE, 2, properties['date_opened_from'].date())
        query.add_term(['date_opened'], pred_data, QOF_QUERY_AND)

    if properties['date_opened_to'] is not None:
        try:
            properties['date_opened_to'] = datetime.datetime.strptime(properties['date_opened_to'], "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDateOpenedTo',
                'The date due from to must be provided in the form YYYY-MM-DD',
                {'field': 'date_opened_to'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_LTE, 2, properties['date_opened_to'].date())
        query.add_term(['date_opened'], pred_data, QOF_QUERY_AND)

    if properties['date_posted_from'] is not None:
        try:
            properties['date_posted_from'] = datetime.datetime.strptime(properties['date_posted_from'], "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDatePostedFrom',
                'The date due from to must be provided in the form YYYY-MM-DD',
                {'field': 'date_posted_from'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_GTE, 2, properties['date_posted_from'].date())
        query.add_term(['date_posted'], pred_data, QOF_QUERY_AND)

    if properties['date_posted_to'] is not None:
        try:
            properties['date_posted_to'] = datetime.datetime.strptime(properties['date_posted_to'], "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDatePostedTo',
                'The date due from to must be provided in the form YYYY-MM-DD',
                {'field': 'date_posted_to'})

        pred_data = gnucash.gnucash_core.QueryDatePredicate(
            QOF_COMPARE_LTE, 2, properties['date_posted_to'].date())
        query.add_term(['date_posted'], pred_data, QOF_QUERY_AND)

    # return only bills (2 = bills)
    pred_data = gnucash.gnucash_core.QueryInt32Predicate(QOF_COMPARE_EQUAL, 2)
    query.add_term([INVOICE_TYPE], pred_data, QOF_QUERY_AND)

    bills = []

    for result in query.run():
        bills.append(gnucash_simple.billToDict(
            gnucash.gnucash_business.Bill(instance=result)))

    query.destroy()

    return bills

def get_gnucash_invoice(book, id):

    # we don't use book.InvoicelLookupByID(id) as this is identical to
    # book.BillLookupByID(id) so can return the same object if they share IDs

    query = gnucash.Query()
    query.search_for('gncInvoice')
    query.set_book(book)

    # return only invoices
    pred_data = gnucash.gnucash_core.QueryInt32Predicate(QOF_COMPARE_EQUAL,
        GNC_INVOICE_CUST_INVOICE)
    query.add_term([INVOICE_TYPE], pred_data, QOF_QUERY_AND)

    INVOICE_ID = 'id'

    pred_data = gnucash.gnucash_core.QueryStringPredicate(
        QOF_COMPARE_EQUAL, id, QOF_STRING_MATCH_NORMAL, False)
    query.add_term([INVOICE_ID], pred_data, QOF_QUERY_AND)

    invoice = None

    for result in query.run():
        invoice = gnucash.gnucash_business.Invoice(instance=result)

    query.destroy()

    return invoice

def get_gnucash_bill(book ,id):

    # we don't use book.InvoicelLookupByID(id) as this is identical to
    # book.BillLookupByID(id) so can return the same object if they share IDs

    query = gnucash.Query()
    query.search_for('gncInvoice')
    query.set_book(book)

    # return only bills (2 = bills)
    pred_data = gnucash.gnucash_core.QueryInt32Predicate(QOF_COMPARE_EQUAL, 2)
    query.add_term([INVOICE_TYPE], pred_data, QOF_QUERY_AND)

    INVOICE_ID = 'id'

    pred_data = gnucash.gnucash_core.QueryStringPredicate(
        QOF_COMPARE_EQUAL, id, QOF_STRING_MATCH_NORMAL, False)
    query.add_term([INVOICE_ID], pred_data, QOF_QUERY_AND)

    bill = None

    for result in query.run():
        bill = gnucash.gnucash_business.Bill(instance=result)

    query.destroy()

    return bill

def get_invoice(book, id):

    return gnucash_simple.invoiceToDict(get_gnucash_invoice(book, id))

def pay_invoice(book, id, posted_account_guid, transfer_account_guid,
    payment_date, memo, num, auto_pay):

    invoice = get_gnucash_invoice(book, id)

    if invoice is None:
        raise Error('NoInvoice', 'An invoice with this ID does not exist',
            {'field': 'id'})

    try:
        payment_date = datetime.datetime.strptime(payment_date, "%Y-%m-%d")
    except ValueError:
        raise Error('InvalidPaymentDate',
            'The payment date must be provided in the form YYYY-MM-DD',
            {'field': 'payment_date'})
    
    account_guid = gnucash.gnucash_core.GUID() 
    gnucash.gnucash_core.GUIDString(transfer_account_guid, account_guid)

    transfer_account = account_guid.AccountLookup(book)

    if transfer_account is None:
        raise Error('NoTransferAccount', 'No account exists with this GUID',
            {'field': 'transfer_account_guid'})

    invoice.ApplyPayment(None, transfer_account, invoice.GetTotal(), GncNumeric(0),
        payment_date, memo, num)

    return gnucash_simple.invoiceToDict(invoice)    

def pay_bill(book, id, posted_account_guid, transfer_account_guid, payment_date,
    memo, num, auto_pay):

    # The posted_account_guid is not actually used in bill.ApplyPayment - why is it on the payment screen?

    bill = get_gnucash_bill(book, id)

    if bill is None:
        raise Error('NoBill', 'A bill with this ID does not exist',
            {'field': 'id'})

    try:
        payment_date = datetime.datetime.strptime(payment_date, "%Y-%m-%d")
    except ValueError:
        raise Error('InvalidPaymentDate',
            'The payment date must be provided in the form YYYY-MM-DD',
            {'field': 'payment_date'})

    account_guid = gnucash.gnucash_core.GUID() 
    gnucash.gnucash_core.GUIDString(transfer_account_guid, account_guid)

    transfer_account = account_guid.AccountLookup(book)

    if transfer_account is None:
        raise Error('NoTransferAccount', 'No account exists with this GUID',
            {'field': 'transfer_account_guid'})

    # We pay the negitive total as the bill as this seemed to cause issues
    # with the split not being set correctly and not being marked as paid
    bill.ApplyPayment(None, transfer_account, bill.GetTotal().neg(), GncNumeric(0),
        payment_date, memo, num)

    return gnucash_simple.billToDict(bill)

def get_bill(book, id):

    return gnucash_simple.billToDict(get_gnucash_bill(book, id))

def add_vendor(book, id, currency_mnumonic, name, contact, address_line_1,
    address_line_2, address_line_3, address_line_4, phone, fax, email):

    if name == '':
        raise Error('NoVendorName', 'A name must be entered for this company',
            {'field': 'name'})

    if (address_line_1 == ''
        and address_line_2 == ''
        and address_line_3 == ''
        and address_line_4 == ''):
        raise Error('NoVendorAddress',
            'An address must be entered for this company',
            {'field': 'address'})

    commod_table = book.get_table()
    currency = commod_table.lookup('CURRENCY', currency_mnumonic)

    if currency is None:
        raise Error('InvalidVendorCurrency',
            'A valid currency must be supplied for this vendor',
            {'field': 'currency'})

    if id is None:
        id = book.VendorNextID()

    vendor = Vendor(book, id, currency, name)

    address = vendor.GetAddr()
    address.SetName(contact)
    address.SetAddr1(address_line_1)
    address.SetAddr2(address_line_2)
    address.SetAddr3(address_line_3)
    address.SetAddr4(address_line_4)
    address.SetPhone(phone)
    address.SetFax(fax)
    address.SetEmail(email)

    return gnucash_simple.vendorToDict(vendor)

def add_customer(book, id, currency_mnumonic, name, contact, address_line_1,
    address_line_2, address_line_3, address_line_4, phone, fax, email):

    if name == '':
        raise Error('NoCustomerName',
            'A name must be entered for this company', {'field': 'name'})

    if (address_line_1 == ''
        and address_line_2 == ''
        and address_line_3 == ''
        and address_line_4 == ''):
        raise Error('NoCustomerAddress',
            'An address must be entered for this company',
            {'field': 'address'})

    commod_table = book.get_table()
    currency = commod_table.lookup('CURRENCY', currency_mnumonic)

    if currency is None:
        raise Error('InvalidCustomerCurrency',
            'A valid currency must be supplied for this customer',
            {'field': 'currency'})

    if id is None:
        id = book.CustomerNextID()

    customer = Customer(book, id, currency, name)

    address = customer.GetAddr()
    address.SetName(contact)
    address.SetAddr1(address_line_1)
    address.SetAddr2(address_line_2)
    address.SetAddr3(address_line_3)
    address.SetAddr4(address_line_4)
    address.SetPhone(phone)
    address.SetFax(fax)
    address.SetEmail(email)

    return gnucash_simple.customerToDict(customer)

def update_customer(book, id, name, contact, address_line_1, address_line_2,
    address_line_3, address_line_4, phone, fax, email):

    customer = book.CustomerLookupByID(id)

    if customer is None:
        raise Error('NoCustomer', 'A customer with this ID does not exist',
            {'field': 'id'})

    if name == '':
        raise Error('NoCustomerName',
            'A name must be entered for this company', {'field': 'name'})

    if (address_line_1 == ''
        and address_line_2 == ''
        and address_line_3 == ''
        and address_line_4 == ''):
        raise Error('NoCustomerAddress',
            'An address must be entered for this company',
            {'field': 'address'})

    customer.SetName(name)

    address = customer.GetAddr()
    address.SetName(contact)
    address.SetAddr1(address_line_1)
    address.SetAddr2(address_line_2)
    address.SetAddr3(address_line_3)
    address.SetAddr4(address_line_4)
    address.SetPhone(phone)
    address.SetFax(fax)
    address.SetEmail(email)

    return gnucash_simple.customerToDict(customer)

def add_invoice(book, id, customer_id, currency_mnumonic, date_opened, notes):

    # Check customer ID is provided to avoid "CRIT <qof> qof_query_string_predicate: assertion '*str != '\0'' failed" error
    if customer_id == '':
        raise Error('NoCustomer',
            'A customer ID must be provided', {'field': 'id'})

    customer = book.CustomerLookupByID(customer_id)

    if customer is None:
        raise Error('NoCustomer',
            'A customer with this ID does not exist', {'field': 'id'})

    if id is None:
        id = book.InvoiceNextID(customer)

    try:
        date_opened = datetime.datetime.strptime(date_opened, "%Y-%m-%d")
    except ValueError:
        raise Error('InvalidDateOpened',
            'The date opened must be provided in the form YYYY-MM-DD',
            {'field': 'date_opened'})

    if currency_mnumonic is None:
        currency_mnumonic = customer.GetCurrency().get_mnemonic()

    commod_table = book.get_table()
    currency = commod_table.lookup('CURRENCY', currency_mnumonic)

    if currency is None:
        raise Error('InvalidInvoiceCurrency',
            'A valid currency must be supplied for this invoice',
            {'field': 'currency'})
    elif currency.get_mnemonic() != customer.GetCurrency().get_mnemonic():
        # Does Gnucash actually enforce this?
        raise Error('MismatchedInvoiceCurrency',
            'The currency of this invoice does not match the customer',
            {'field': 'currency'})

    invoice = Invoice(book, id, currency, customer, date_opened.date())

    invoice.SetNotes(notes)

    return gnucash_simple.invoiceToDict(invoice)

def update_invoice(book, id, customer_id, currency_mnumonic, date_opened,
    notes, posted, posted_account_guid, posted_date, due_date, posted_memo,
    posted_accumulatesplits, posted_autopay):

    invoice = get_gnucash_invoice(book, id)

    if invoice is None:
        raise Error('NoInvoice',
            'An invoice with this ID does not exist',
            {'field': 'id'})

    customer = book.CustomerLookupByID(customer_id)

    if customer is None:
        raise Error('NoCustomer', 'A customer with this ID does not exist',
            {'field': 'customer_id'})

    try:
        date_opened = datetime.datetime.strptime(date_opened, "%Y-%m-%d")
    except ValueError:
        raise Error('InvalidDateOpened',
            'The date opened must be provided in the form YYYY-MM-DD',
            {'field': 'date_opened'})

    if posted_date == '':
        if posted == 1:
            raise Error('NoDatePosted',
                'The date posted must be supplied when posted=1',
                {'field': 'date_posted'})
    else:
        try:
            posted_date = datetime.datetime.strptime(posted_date, "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDatePosted',
                'The date posted must be provided in the form YYYY-MM-DD',
                {'field': 'posted_date'})

    if due_date == '':
        if posted == 1:
            raise Error('NoDateDue',
                'The due date must be supplied when posted=1',
                {'field': 'due_date'})
    else:
        try:
            due_date = datetime.datetime.strptime(due_date, "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDateDue',
                'The due date must be provided in the form YYYY-MM-DD',
                {'field': 'due_date'})

    if posted_account_guid == '':
        if posted == 1:
            raise Error('NoPostedAccountGuid',
                'The posted account GUID must be supplied when posted=1',
                {'field': 'posted_account_guid'})
    else:
        guid = gnucash.gnucash_core.GUID() 
        gnucash.gnucash_core.GUIDString(posted_account_guid, guid)

        posted_account = guid.AccountLookup(book)

        if posted_account is None:
            raise Error('NoAccount',
                'No account exists with the posted account GUID',
                {'field': 'posted_account_guid'})

    invoice.SetOwner(customer)
    invoice.SetDateOpened(date_opened)
    invoice.SetNotes(notes)

    # post if currently unposted and posted=1
    if (invoice.GetDatePosted() is None and posted == 1):
        invoice.PostToAccount(posted_account, posted_date, due_date,
            posted_memo, posted_accumulatesplits, posted_autopay)

    return gnucash_simple.invoiceToDict(invoice)

def update_bill(book, id, vendor_id, currency_mnumonic, date_opened, notes,
    posted, posted_account_guid, posted_date, due_date, posted_memo,
    posted_accumulatesplits, posted_autopay):

    bill = get_gnucash_bill(book, id)

    if bill is None:
        raise Error('NoBill', 'A bill with this ID does not exist',
            {'field': 'id'})

    vendor = book.VendorLookupByID(vendor_id)

    if vendor is None:
        raise Error('NoVendor',
            'A vendor with this ID does not exist',
            {'field': 'vendor_id'})

    try:
        date_opened = datetime.datetime.strptime(date_opened, "%Y-%m-%d")
    except ValueError:
        raise Error('InvalidDateOpened',
            'The date opened must be provided in the form YYYY-MM-DD',
            {'field': 'date_opened'})

    if posted_date == '':
        if posted == 1:
            raise Error('NoDatePosted',
                'The date posted must be supplied when posted=1',
                {'field': 'date_posted'})
    else:
        try:
            posted_date = datetime.datetime.strptime(posted_date, "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDatePosted',
                'The date posted must be provided in the form YYYY-MM-DD',
                {'field': 'posted_date'})

    if due_date == '':
        if posted == 1:
            raise Error('NoDateDue',
                'The due date must be supplied when posted=1',
                {'field': 'date_sue'})
    else:
        try:
            due_date = datetime.datetime.strptime(due_date, "%Y-%m-%d")
        except ValueError:
            raise Error('InvalidDateDue',
                'The due date must be provided in the form YYYY-MM-DD',
                {'field': 'due_date'})

    if posted_account_guid == '':
        if posted == 1:
            raise Error('NoPostedAccountGuid',
                'The posted account GUID must be supplied when posted=1',
                {'field': 'posted_account_guid'})
    else:
        guid = gnucash.gnucash_core.GUID() 
        gnucash.gnucash_core.GUIDString(posted_account_guid, guid)

        posted_account = guid.AccountLookup(book)

        if posted_account is None:
            raise Error('NoAccount',
                'No account exists with the posted account GUID',
                {'field': 'posted_account_guid'})

    bill.SetOwner(vendor)
    bill.SetDateOpened(date_opened)
    bill.SetNotes(notes)

    # post if currently unposted and posted=1
    if bill.GetDatePosted() is None and posted == 1:
        bill.PostToAccount(posted_account, posted_date, due_date, posted_memo,
            posted_accumulatesplits, posted_autopay)

    return gnucash_simple.billToDict(bill)

def add_entry(book, invoice_id, date, description, account_guid, quantity,
    price, discount_type, discount):

    invoice = get_gnucash_invoice(book, invoice_id)

    if invoice is None:
        raise Error('NoInvoice',
            'No invoice exists with this ID', {'field': 'invoice_id'})

    try:
        date = datetime.datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise Error('InvalidDateOpened',
            'The date opened must be provided in the form YYYY-MM-DD',
            {'field': 'date'})

    # Only value based discounts are supported
    if discount_type != GNC_AMT_TYPE_VALUE:
        raise Error('UnsupportedDiscountType', 'Only value based discounts are currently supported',
            {'field': 'discount_type'})

    guid = gnucash.gnucash_core.GUID() 
    gnucash.gnucash_core.GUIDString(account_guid, guid)

    account = guid.AccountLookup(book)

    if account is None:
        raise Error('NoAccount', 'No account exists with this GUID',
            {'field': 'account_guid'})

    try:
        quantity = Decimal(quantity).quantize(Decimal('.01'))
    except ArithmeticError:
        raise Error('InvalidQuantity', 'This quantity is not valid',
            {'field': 'quantity'})

    try:
        price = Decimal(price).quantize(Decimal('.01'))
    except ArithmeticError:
        raise Error('InvalidPrice', 'This price is not valid',
            {'field': 'price'})

    # Currently only value based discounts are supported
    try:
        discount = Decimal(discount).quantize(Decimal('.01'))
    except ArithmeticError:
        raise Error('InvalidDiscount', 'This discount is not valid',
            {'field': 'discount'})

    entry = Entry(book, invoice, date.date())
    entry.SetDateEntered(datetime.datetime.now())
    entry.SetDescription(description)
    entry.SetInvAccount(account)
    entry.SetQuantity(gnc_numeric_from_decimal(quantity))
    entry.SetInvPrice(gnc_numeric_from_decimal(price))
    # Do we need to set this?
    # entry.SetInvDiscountHow()
    entry.SetInvDiscountType(discount_type)
    # Currently only value based discounts are supported
    entry.SetInvDiscount(gnc_numeric_from_decimal(discount))

    return gnucash_simple.entryToDict(entry)

def add_bill_entry(book, bill_id, date, description, account_guid, quantity, 
    price):

    bill = get_gnucash_bill(book,bill_id)

    if bill is None:
        raise Error('NoBill', 'No bill exists with this ID',
            {'field': 'bill_id'})

    try:
        date = datetime.datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise Error('InvalidDateOpened',
            'The date opened must be provided in the form YYYY-MM-DD',
            {'field': 'date'})

    guid = gnucash.gnucash_core.GUID() 
    gnucash.gnucash_core.GUIDString(account_guid, guid)

    account = guid.AccountLookup(book)

    if account is None:
        raise Error('NoAccount', 'No account exists with this GUID',
            {'field': 'account_guid'})

    try:
        quantity = Decimal(quantity).quantize(Decimal('.01'))
    except ArithmeticError:
        raise Error('InvalidQuantity', 'This quantity is not valid',
            {'field': 'quantity'})

    try:
        price = Decimal(price).quantize(Decimal('.01'))
    except ArithmeticError:
        raise Error('InvalidPrice', 'This price is not valid',
            {'field': 'price'})
    
    entry = Entry(book, bill, date.date())
    entry.SetDateEntered(datetime.datetime.now())
    entry.SetDescription(description)
    entry.SetBillAccount(account)
    entry.SetQuantity(gnc_numeric_from_decimal(quantity))
    entry.SetBillPrice(gnc_numeric_from_decimal(price))
    
    return gnucash_simple.entryToDict(entry)

def get_entry(book, entry_guid):

    guid = gnucash.gnucash_core.GUID() 
    gnucash.gnucash_core.GUIDString(entry_guid, guid)

    entry = book.EntryLookup(guid)

    if entry is None:
        return None
    else:
        return gnucash_simple.entryToDict(entry)

def update_entry(book, entry_guid, date, description, account_guid, quantity,
    price, discount_type, discount):

    guid = gnucash.gnucash_core.GUID() 
    gnucash.gnucash_core.GUIDString(entry_guid, guid)

    entry = book.EntryLookup(guid)

    if entry is None:
        raise Error('NoEntry', 'No entry exists with this GUID',
            {'field': 'entry_guid'})

    try:
        date = datetime.datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise Error('InvalidDateOpened',
            'The date opened must be provided in the form YYYY-MM-DD',
            {'field': 'date'})

    # Only check discount type for invoices
    if entry.GetInvAccount() is not None:
        # Only value based discounts are supported
        if discount_type != GNC_AMT_TYPE_VALUE:
            raise Error('UnsupportedDiscountType', 'Only value based discounts are currently supported',
                {'field': 'discount_type'})
 
    gnucash.gnucash_core.GUIDString(account_guid, guid)

    account = guid.AccountLookup(book)

    if account is None:
        raise Error('NoAccount', 'No account exists with this GUID',
            {'field': 'account_guid'})

    try:
        quantity = Decimal(quantity).quantize(Decimal('.01'))
    except ArithmeticError:
        raise Error('InvalidQuantity', 'This quantity is not valid',
            {'field': 'quantity'})

    try:
        price = Decimal(price).quantize(Decimal('.01'))
    except ArithmeticError:
        raise Error('InvalidPrice', 'This price is not valid',
            {'field': 'price'})

    # Only discount for invoices
    if entry.GetInvAccount() is not None:
        # Currently only value based discounts are supported

        # As bills may pass the discount though as None check this and raise an error for invoices
        if discount is None:
            raise Error('InvalidDiscount', 'This discount is not valid',
                {'field': 'discount'})

        try:
            discount = Decimal(discount).quantize(Decimal('.01'))
        except ArithmeticError:
            raise Error('InvalidDiscount', 'This discount is not valid',
                {'field': 'discount'})

    entry.SetDate(date.date())

    entry.SetDateEntered(datetime.datetime.now())
    entry.SetDescription(description)
    entry.SetQuantity(gnc_numeric_from_decimal(quantity))

    if entry.GetInvAccount() is not None:
        entry.SetInvAccount(account)
        entry.SetInvPrice(gnc_numeric_from_decimal(price))
    else:
        entry.SetBillAccount(account)
        entry.SetBillPrice(gnc_numeric_from_decimal(price))

    # Only set discount for invoices
    if entry.GetInvAccount() is not None:
        # Do we need to set this?
        # entry.SetInvDiscountHow()

        entry.SetInvDiscountType(discount_type)
        # Currently only value based discounts are supported
        entry.SetInvDiscount(gnc_numeric_from_decimal(discount))

    return gnucash_simple.entryToDict(entry)

def delete_entry(book, entry_guid):

    guid = gnucash.gnucash_core.GUID() 
    gnucash.gnucash_core.GUIDString(entry_guid, guid)

    entry = book.EntryLookup(guid)

    invoice = entry.GetInvoice()
    bill = entry.GetBill()

    if invoice is not None and entry is not None:
        invoice.RemoveEntry(entry)
    elif bill is not None and entry is not None:
        bill.RemoveEntry(entry)

    if entry is not None:
        entry.Destroy()

def delete_transaction(book, transaction_guid):

    guid = gnucash.gnucash_core.GUID() 
    gnucash.gnucash_core.GUIDString(transaction_guid, guid)

    transaction = guid.TransLookup(book)

    # Might be nicer to raise a 404?
    if transaction is None:
        raise Error('NoTransaction', 'A transaction with this GUID does not exist',
            {'field': 'id'})

    transaction.Destroy()

def add_bill(book, id, vendor_id, currency_mnumonic, date_opened, notes):

    vendor = book.VendorLookupByID(vendor_id)

    if vendor is None:
        raise Error('NoVendor', 'A vendor with this ID does not exist',
            {'field': 'id'})

    if id is None:
        id = book.BillNextID(vendor)

    try:
        date_opened = datetime.datetime.strptime(date_opened, "%Y-%m-%d")
    except ValueError:
        raise Error('InvalidDateOpened',
            'The date opened must be provided in the form YYYY-MM-DD',
            {'field': 'date_opened'})

    if currency_mnumonic is None:
        currency_mnumonic = vendor.GetCurrency().get_mnemonic()

    commod_table = book.get_table()
    currency = commod_table.lookup('CURRENCY', currency_mnumonic)

    if currency is None:
        raise Error('InvalidBillCurrency',
            'A valid currency must be supplied for this bill',
            {'field': 'currency'})
    elif currency.get_mnemonic() != vendor.GetCurrency().get_mnemonic():
        # Does Gnucash actually enforce this?
        raise Error('MismatchedBillCurrency',
            'The currency of this bill does not match the vendor',
            {'field': 'currency'})

    bill = Bill(book, id, currency, vendor, date_opened.date())

    bill.SetNotes(notes)

    return gnucash_simple.billToDict(bill)

def add_account(book, name, currency_mnumonic, account_type_id, parent_account_guid):

    from gnucash.gnucash_core_c import \
    ACCT_TYPE_BANK, ACCT_TYPE_CASH, ACCT_TYPE_CREDIT, ACCT_TYPE_ASSET, \
    ACCT_TYPE_LIABILITY , ACCT_TYPE_STOCK , ACCT_TYPE_MUTUAL, \
    ACCT_TYPE_INCOME, ACCT_TYPE_EXPENSE, ACCT_TYPE_EQUITY, \
    ACCT_TYPE_RECEIVABLE, ACCT_TYPE_PAYABLE, ACCT_TYPE_TRADING 

    if name == '':
        raise Error('NoAccountName', 'A name must be entered for this account',
            {'field': 'name'})

    commod_table = book.get_table()
    currency = commod_table.lookup('CURRENCY', currency_mnumonic)

    if currency is None:
        raise Error('InvalidAccountCurrency',
            'A valid currency must be supplied for this account',
            {'field': 'currency'})

    if account_type_id not in [ACCT_TYPE_BANK, ACCT_TYPE_CASH, ACCT_TYPE_CREDIT, \
    ACCT_TYPE_ASSET, ACCT_TYPE_LIABILITY , ACCT_TYPE_STOCK , ACCT_TYPE_MUTUAL, \
    ACCT_TYPE_INCOME, ACCT_TYPE_EXPENSE, ACCT_TYPE_EQUITY, ACCT_TYPE_RECEIVABLE, \
    ACCT_TYPE_PAYABLE, ACCT_TYPE_TRADING]:
        raise Error('InvalidAccountTypeID',
            'A valid account type ID must be supplied for this account',
            {'field': 'account_type_id'})

    if parent_account_guid == '':
        parent_account = book.get_root_account()
    else:
        account_guid = gnucash.gnucash_core.GUID() 
        gnucash.gnucash_core.GUIDString(parent_account_guid, account_guid)

        parent_account = account_guid.AccountLookup(book)

    if parent_account is None:
        raise Error('InvalidParentAccount',
            'A valid account parent account must be supplied for this account',
            {'field': 'parent_account_guid'})

    account = Account(book)
    parent_account.append_child(account)
    account.SetName(name)
    account.SetType(account_type_id)
    account.SetCommodity(currency)

    return gnucash_simple.accountToDict(account)

def add_transaction(book, num, description, date_posted, currency_mnumonic, splits):

    transaction = Transaction(book)

    transaction.BeginEdit()

    commod_table = book.get_table()
    currency = commod_table.lookup('CURRENCY', currency_mnumonic)

    if currency is None:
        raise Error('InvalidTransactionCurrency',
            'A valid currency must be supplied for this transaction',
            {'field': 'currency'})

    try:
        date_posted = datetime.datetime.strptime(date_posted, "%Y-%m-%d")
    except ValueError:
        raise Error('InvalidDatePosted',
            'The date posted must be provided in the form YYYY-MM-DD',
            {'field': 'date_posted'})

    if len(splits) is 0:
        raise Error('NoSplits',
            'At least one split must be provided',
            {'field': 'splits'})

    for split_values in splits:
        account_guid = gnucash.gnucash_core.GUID() 
        gnucash.gnucash_core.GUIDString(split_values['account_guid'], account_guid)

        account = account_guid.AccountLookup(book)

        if account is None:
            raise Error('InvalidSplitAccount',
                'A valid account must be supplied for this split',
                {'field': 'account'})

        if account.GetCommodity().get_mnemonic() != currency_mnumonic:
            raise Error('InvalidSplitAccountCurrency',
                'The transaction currency must match the account currency for this split',
                {'field': 'account'})

        # TODO - the API should probably allow numerator and denomiator rather than assue 100
        value = split_values['value']

        try: 
            value = float(value)
            value = value * 100
            value = int(value)
        except ValueError:
            raise Error('InvalidSplitValue',
            'A valid value must be supplied for this split',
            {'field': 'value'})
        except TypeError:
            raise Error('InvalidSplitValue',
            'A valid value must be supplied for this split',
            {'field': 'value'})

        split = Split(book)
        split.SetValue(GncNumeric(value, 100))
        split.SetAccount(account)
        split.SetParent(transaction)

    # TODO - check that splits match...

    transaction.SetCurrency(currency)
    transaction.SetDescription(description)
    transaction.SetNum(num)

    # This function changes at some point between Gnucash/Python 2/3
    if sys.version_info >= (3,0):
        transaction.SetDatePostedSecs(date_posted)
    else:
        transaction.SetDatePostedTS(date_posted)

    transaction.CommitEdit()

    return gnucash_simple.transactionToDict(transaction, ['splits'])

def get_transaction(book, transaction_guid):

    guid = gnucash.gnucash_core.GUID() 
    gnucash.gnucash_core.GUIDString(transaction_guid, guid)

    transaction = guid.TransLookup(book)

    if transaction is None:
        return None
    else:
        return gnucash_simple.transactionToDict(transaction, ['splits'])

def edit_transaction(book, transaction_guid, num, description, date_posted,
    currency_mnumonic, splits):

    guid = gnucash.gnucash_core.GUID() 
    gnucash.gnucash_core.GUIDString(transaction_guid, guid)

    transaction = guid.TransLookup(book)

    if transaction is None:
        raise Error('InvalidTransactionGuid',
            'A transaction with this GUID does not exist',
            {'field': 'guid'})

    transaction.BeginEdit()

    commod_table = book.get_table()
    currency = commod_table.lookup('CURRENCY', currency_mnumonic)

    if currency is None:
        raise Error('InvalidTransactionCurrency',
            'A valid currency must be supplied for this transaction',
            {'field': 'currency'})

    try:
        date_posted = datetime.datetime.strptime(date_posted, "%Y-%m-%d")
    except ValueError:
        raise Error('InvalidDatePosted',
            'The date posted must be provided in the form YYYY-MM-DD',
            {'field': 'date_posted'})

    if len(splits) is 0:
        raise Error('NoSplits',
            'At least one split must be provided',
            {'field': 'splits'})

    split_guids = []

    # Should we do all checks before calling split_guid.SplitLookup(book) as it's not clear when these will be comitted?
    for split_values in splits:

        split_guids.append(split_values['guid']);

        split_guid = gnucash.gnucash_core.GUID() 
        gnucash.gnucash_core.GUIDString(split_values['guid'], split_guid)

        split = split_guid.SplitLookup(book)

        if split is None:
            raise Error('InvalidSplitGuid',
                'A valid guid must be supplied for this split',
                {'field': 'guid'})

        account_guid = gnucash.gnucash_core.GUID() 
        gnucash.gnucash_core.GUIDString(
            split_values['account_guid'], account_guid)

        account = account_guid.AccountLookup(book)

        if account is None:
            raise Error('InvalidSplitAccount',
                'A valid account must be supplied for this split',
                {'field': 'account'})

        if account.GetCommodity().get_mnemonic() != currency_mnumonic:
            raise Error('InvalidSplitAccountCurrency',
                'The transaction currency must match the account currency for this split',
                {'field': 'account'})

        # TODO - the API should probably allow numerator and denomiator rather than assue 100
        value = split_values['value']

        try: 
            value = float(value)
            value = value * 100
            value = int(value)
        except ValueError:
            raise Error('InvalidSplitValue',
            'A valid value must be supplied for this split',
            {'field': 'value'})
        except TypeError:
            raise Error('InvalidSplitValue',
            'A valid value must be supplied for this split',
            {'field': 'value'})

        split.SetValue(GncNumeric(value, 100))
        split.SetAccount(account)
        split.SetParent(transaction)

    if len(split_guids) != len(set(split_guids)):
        raise Error('DuplicateSplitGuid',
            'One of the splits provided shares a GUID with another split',
            {'field': 'guid'})

    transaction.SetCurrency(currency)
    transaction.SetDescription(description)
    transaction.SetNum(num)

    # This function changes at some point between Guncash/Python 2/3
    if sys.version_info >= (3,0):
        transaction.SetDatePostedSecs(date_posted)
    else:
        transaction.SetDatePostedTS(date_posted)

    transaction.CommitEdit()

    return gnucash_simple.transactionToDict(transaction, ['splits'])

def start_session(connection_string, is_new, ignore_lock):

    global session

    # If no parameters are supplied attempt to use the app.connection_string if one exists
    if connection_string == '' and is_new == '' and  ignore_lock == '' and hasattr(app, 'connection_string') and app.connection_string != '':
        is_new = False
        ignore_lock = False
        connection_string = app.connection_string

    if connection_string == '':
        raise Error('InvalidConnectionString', 'A connection string must be supplied',
            {'field': 'connection_string'})

    if str(is_new).lower() in ['true', '1', 't', 'y', 'yes']:
        is_new = True
    elif str(is_new).lower() in ['false', '0', 'f', 'n', 'no']:
        is_new = False
    else:
        raise Error('InvalidIsNew', 'is_new must be true or false',
            {'field': 'is_new'})

    if str(ignore_lock).lower() in ['true', '1', 't', 'y', 'yes']:
        ignore_lock = True
    elif str(ignore_lock).lower() in ['false', '0', 'f', 'n', 'no']:
        ignore_lock = False
    else:
        raise Error('InvalidIgnoreLock', 'ignore_lock must be true or false',
            {'field': 'ignore_lock'})

    if session is not None:
        raise Error('SessionExists',
            'The session alredy exists',
            {})

    try:
        session = gnucash.Session(connection_string, is_new=is_new, ignore_lock=ignore_lock)
    except gnucash.GnuCashBackendException as e:
        raise Error('GnuCashBackendException',
            'There was an error starting the session',
            {
                'message': e.args[0],
                'code': parse_gnucash_backend_exception(e.args[0])
            })

    return session

def end_session():

    global session

    if session == None:
        raise Error('SessionDoesNotExist',
            'The session does not exist',
            {})

    # Does the need to be called? Has resulted in:
    #
    # File "/usr/local/lib/python2.7/dist-packages/gnucash/gnucash_core.py", line 151, in new_function
    # self.raise_backend_errors(function.__name__)
    # File "/usr/local/lib/python2.7/dist-packages/gnucash/gnucash_core.py", line 129, in raise_backend_errors
    #errors )
    # GnuCashBackendException: call to new_function resulted in the following errors, ERR_BACKEND_SERVER_ERR
    #
    # Ref: https://lists.gnucash.org/pipermail/gnucash-devel/2013-February/034992.html

    # Don't call session.save as this seems to prevent subsequent commands being run on shutdown leaving database in locked state (will this cause issues for xml backend?)

    #try:
    #    session.save()
    #except gnucash.GnuCashBackendException as e:
    #    raise Error('GnuCashBackendException',
    #        'There was an error saving the session',
    #        {
    #            'message': e.args[0],
    #            'code': parse_gnucash_backend_exception(e.args[0])
    #        })

    session.end()
    session.destroy()

    session = None

def get_session():

    global session

    if session == None:
        raise Error('SessionDoesNotExist',
            'The session does not exist',
            {})

    return session

def startup():

    if hasattr(app, 'connection_string') and app.connection_string != '': 
        is_new = False
        ignore_lock = False

        try:
            return start_session(app.connection_string, is_new, ignore_lock)
        except Error as error:
            # We can't return a response here as this is run before the first request so no way to alert user to the error?
            return error

def shutdown():
    try:
        end_session()
    except: 
        # Errors are ignored as we can't pass them back via the response (could log them though...)
        pass

def parse_gnucash_backend_exception(exception_string):
    # Argument is of the form "call to %s resulted in the following errors, %s" - extract the second string
    reresult = re.match(r'^call to (.*?) resulted in the following errors, (.*?)$', exception_string)
    if len(reresult.groups()) == 2:
        return reresult.group(2)
    else:
        return ''

def sint(s):
    try:
        return int(s)
    except ValueError:
        return None

def gnc_numeric_from_decimal(decimal_value):
    sign, digits, exponent = decimal_value.as_tuple()

    # convert decimal digits to a fractional numerator
    # equivlent to
    # numerator = int(''.join(digits))
    # but without the wated conversion to string and back,
    # this is probably the same algorithm int() uses
    numerator = 0
    TEN = int(Decimal(0).radix()) # this is always 10
    numerator_place_value = 1
    # add each digit to the final value multiplied by the place value
    # from least significant to most sigificant
    for i in range(len(digits)-1,-1,-1):
        numerator += digits[i] * numerator_place_value
        numerator_place_value *= TEN

    if decimal_value.is_signed():
        numerator = -numerator

    # if the exponent is negative, we use it to set the denominator
    if exponent < 0 :
        denominator = TEN ** (-exponent)
    # if the exponent isn't negative, we bump up the numerator
    # and set the denominator to 1
    else:
        numerator *= TEN ** exponent
        denominator = 1

    return GncNumeric(numerator, denominator)

class Error(Exception):
    """Base class for exceptions in this module."""
    def __init__(self, type, message, data):
        self.type = type
        self.message = message
        self.data = data
