import unittest
import json
import gnucash
import gnucash_rest
import MySQLdb
import warnings
import sys

class ApiTestCase(unittest.TestCase):

    def setUp(self):
        self.app = gnucash_rest.app.test_client()
        self.app.testing = True

    def setup_database(self):
        database = MySQLdb.connect(host='localhost', user='root', passwd='oxford')
        cursor = database.cursor()
        sql = 'CREATE DATABASE test'
        cursor.execute(sql)

    def teardown_database(self):
        warnings.filterwarnings('ignore', category = MySQLdb.Warning)
        database = MySQLdb.connect(host='localhost', user='root', passwd='oxford')
        cursor = database.cursor()
        sql = 'DROP DATABASE IF EXISTS test'
        cursor.execute(sql)

    # probably not the most pythonic way to do this
    def clean(self, data):
        # convert bytes to Python 3 string if required
        if sys.version_info >= (3,0):
            return data.decode("utf-8")
        else:
            return data

    def get_error_type(self, method, url, data):
        if method is 'get':
            response = self.app.get(url)
        elif method is 'post':
            response = self.app.post(url, data=data)
        elif method is 'delete':
            response = self.app.delete(url, data=data)
        else:
            raise ValueError('unknown method in assert_error_type')

        if response.status == '400 BAD REQUEST':
            json_response = json.loads(self.clean(response.data))
            return json_response['errors'][0]['type']
        else:
            raise ValueError('Non 400 error code: ' + response.status)

class ApiSessionTestCase(ApiTestCase):

    def setUp(self):
        self.app = gnucash_rest.app.test_client()
        self.app.testing = True

        # remove the database in case tests failed previously
        self.teardown_database()

        self.setup_database()

        data = dict(
            connection_string = 'mysql://root:oxford@localhost/test',
            is_new = '1',
            ignore_lock = '0'
        )

        response = self.app.post('/session', data=data)
        assert self.clean(response.data) == '"Session started"'

    def tearDown(self):

        response = self.app.delete('/session')
        assert self.clean(response.data) == '"Session ended"'

        self.teardown_database()

class RootTestCase(ApiTestCase):

    def test_root(self):
        response = self.app.get('/')
        assert self.clean(response.data) == '"Gnucash REST API"'

    def test_root_cors(self):
        gnucash_rest.app.cors_origin = '*'

        response = self.app.get('/')
        assert response.headers['Access-Control-Allow-Origin'] == '*'

        del gnucash_rest.app.cors_origin

class SessionTestCase(ApiTestCase):

    def test_no_session(self):
        data = dict()
        assert self.get_error_type('get', '/accounts', data) == 'SessionDoesNotExist'

    def test_session_no_params(self):
        data = dict()
        assert self.get_error_type('post', '/session', data) == 'InvalidConnectionString'

    def test_session_connection_string(self):
        data = dict(
            connection_string = 'mysql://root:oxford@localhost/test'
        )
        assert self.get_error_type('post', '/session', data) == 'InvalidIsNew'

    def test_session_isnew(self):
        data = dict(
            connection_string = 'mysql://root:oxford@localhost/test',
            is_new='1'
        )
        assert self.get_error_type('post', '/session', data) == 'InvalidIgnoreLock'

    def test_session_auto_error(self):
        gnucash_rest.app.connection_string = 'mysql://root:oxford@localhost/none'

        # remove the database in case tests failed previously
        self.teardown_database()

        self.setup_database()

        # Logs
        # CRIT <gnc.backend.dbi> [GncDbiSqlConnection::begin_transaction()] BEGIN transaction failed()

        error = gnucash_rest.startup()
        assert error.data['code'] == 'ERR_BACKEND_NO_SUCH_DB'

        self.teardown_database()

        del gnucash_rest.app.connection_string

    def test_session_auto(self):
        gnucash_rest.app.connection_string = 'mysql://root:oxford@localhost/test'

        # remove the database in case tests failed previously
        self.teardown_database()

        self.setup_database()

        database = gnucash_rest.startup()
        assert isinstance(database, gnucash.gnucash_core.Session)

        # Logs
        # CRIT <gnc.backend.dbi> gnc_dbi_unlock: assertion 'dbi_conn_error( dcon, NULL ) == 0' failed

        response = self.app.delete('/session')
        assert self.clean(response.data) == '"Session ended"'

        self.teardown_database()

        del gnucash_rest.app.connection_string

    def test_session(self):
        data = dict(
            connection_string = 'mysql://root:oxford@localhost/test',
            is_new = '1',
            ignore_lock = '0'
        )

        # Logs
        # WARN <gnc.backend.dbi> [gnc_dbi_unlock()] No lock table in database, so not unlocking it.

        # remove the database in case tests failed previously
        self.teardown_database()

        self.setup_database()

        # 201 CREATED
        response = self.app.post('/session', data=data)
        assert self.clean(response.data) == '"Session started"'

        response = self.app.delete('/session')
        assert self.clean(response.data) == '"Session ended"'

        self.teardown_database()

    def test_session_end_error(self):
        assert self.get_error_type('delete', '/session', dict()) == 'SessionDoesNotExist'

    def test_no_method(self):
        assert self.app.open('/session', method='NONE').status == '405 METHOD NOT ALLOWED'
        

class AccountsTestCase(ApiTestCase):

    def test_accounts_no_session(self):
        assert self.get_error_type('get', '/accounts', dict()) == 'SessionDoesNotExist'

    def test_account_get_no_session(self):
        assert self.get_error_type('get', '/accounts/none', dict()) == 'SessionDoesNotExist'

    def test_no_method(self):
        assert self.app.open('/accounts', method='NONE').status == '405 METHOD NOT ALLOWED'

    def test_account_get_splits_no_session(self):
        assert self.get_error_type('get', '/accounts/none/splits', dict()) == 'SessionDoesNotExist'

class AccountsSessionTestCase(ApiTestCase):

    def setUp(self):
        self.app = gnucash_rest.app.test_client()
        self.app.testing = True

        # remove the database in case tests failed previously
        self.teardown_database()

        self.setup_database()

        data = dict(
            connection_string = 'mysql://root:oxford@localhost/test',
            is_new = '1',
            ignore_lock = '0'
        )

        response = self.app.post('/session', data=data)
        assert self.clean(response.data) == '"Session started"'

    def tearDown(self):

        response = self.app.delete('/session')
        assert self.clean(response.data) == '"Session ended"'

        self.teardown_database()

    def test_accounts(self):

        response = json.loads(self.clean(self.app.get('/accounts').data))
        assert response['name'] == 'Root Account'

    # need tests for mangled add accounts

    def test_add_top_account(self):

        response = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        assert response['name'] == 'Test'

    def test_add_account_no_data(self):

        data = dict()

        assert self.get_error_type('post', '/accounts', data) == 'NoAccountName'

    def test_add_account_no_currency(self):
        data = dict(
            name = 'Test'
        )
        assert self.get_error_type('post', '/accounts', data) == 'InvalidAccountCurrency'

    def test_add_account_invalid_currency(self):

        data = dict(
            name = 'Test',
            currency  = 'XYZ'
        )

        assert self.get_error_type('post', '/accounts', data) == 'InvalidAccountCurrency'

    def test_add_account_invalid_acount_type(self):

        data = dict(
            name = 'Test',
            currency  = 'GBP',
            account_type_id = 'X',
        )

        assert self.get_error_type('post', '/accounts', data) == 'InvalidAccountTypeID'

    def test_add_account(self):

        # this is test_accounts
        response = json.loads(self.clean(self.app.get('/accounts').data))
        assert response['name'] == 'Root Account'

        response = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test',
            currency  = 'GBP',
            account_type_id = '2',
            parent_account_guid = response['guid'],
        )).data))

        assert response['name'] == 'Test'

    def test_get_account_none(self):
        assert self.app.get('/accounts/none').status == '404 NOT FOUND'

    def test_add_and_get_account(self):

        # this is test_add_account
        response = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        response = json.loads(self.clean(self.app.get('/accounts/' + response['guid']).data))

        assert response['name'] == 'Test'

    def test_account_get_splits_no_account(self):
        assert self.app.get('/accounts/none/splits').status == '404 NOT FOUND'
    
    def test_account_get_splits_empty(self):
        # this is test_add_account
        response = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        # Logs in Python3 - this probably actually results in failing to return splits - though there's no test yet
        # WARN <qof.class> [qof_class_get_parameter()] no object of type qof_class_get_parameter
        # WARN <qof.class> [qof_class_get_parameter()] no object of type qof_class_get_parameter
        # WARN <qof.class> [qof_class_get_parameter()] no object of type qof_class_get_parameter
        # CRIT <qof.object> [qof_object_foreach()] No object of type qof_object_foreach

        assert json.loads(self.clean(self.app.get('/accounts/' + response['guid'] + '/splits').data)) == []

class TransactionsTestCase(ApiTestCase):

    def test_transactions_no_session(self):
        assert self.get_error_type('post', '/transactions', dict()) == 'SessionDoesNotExist'

    def test_transaction_no_session(self):
        assert self.get_error_type('post', '/transactions/none', dict()) == 'SessionDoesNotExist'

class TransactionsSessionTestCase(ApiTestCase):

    def setUp(self):
        self.app = gnucash_rest.app.test_client()
        self.app.testing = True

        # remove the database in case tests failed previously
        self.teardown_database()

        self.setup_database()

        data = dict(
            connection_string = 'mysql://root:oxford@localhost/test',
            is_new = '1',
            ignore_lock = '0'
        )

        response = self.app.post('/session', data=data)
        assert self.clean(response.data) == '"Session started"'

    def tearDown(self):

        response = self.app.delete('/session')
        assert self.clean(response.data) == '"Session ended"'

        self.teardown_database()

    def createTransaction(self):

        # Gnucash does allow a transaction to be across the same accounts so this test is correct!

        # this is test_accounts
        splitaccount1 = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        splitaccount2 = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test 2',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitaccount1 = splitaccount1['guid'],
            splitaccount2 = splitaccount2['guid'],
            splitvalue1 = '0',
            splitvalue2 = '0'
        )

        # Errors with 20:11:22  CRIT <gnc.backend.dbi> [mysql_error_fn()] DBI error: 1292: Incorrect datetime value: '19700101000000' for column 'reconcile_date' at row 1
        # Due to https://bugzilla.gnome.org/show_bug.cgi?id=784623
        # Worked around by adding the following to mysqld.cnf
        # sql_mode=ONLY_FULL_GROUP_BY,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION

        return json.loads(self.clean(self.app.post('/transactions', data=data).data))

    def createTransactionGuid(self):
        transaction = self.createTransaction()
        return transaction['guid']

    def test_no_method(self):
        assert self.app.get('/transactions').status == '405 METHOD NOT ALLOWED'

    def test_add_transaction_no_data(self):
        data = dict()
        assert self.get_error_type('post', '/transactions', data) == 'InvalidTransactionCurrency'

    def test_add_transaction_invalid_currency(self):
        data = dict(
            currency = 'XYZ'
        )
        assert self.get_error_type('post', '/transactions', data) == 'InvalidTransactionCurrency'

    def test_add_transaction_no_date_posted(self):
        data = dict(
            currency = 'GBP'
        )
        assert self.get_error_type('post', '/transactions', data) == 'InvalidDatePosted'

    def test_add_transaction_invalid_date_posted(self):
        data = dict(
            currency = 'GBP',
            posted_date = 'XXX'
        )
        assert self.get_error_type('post', '/transactions', data) == 'InvalidDatePosted'

    def test_add_transaction_no_split_account(self):
        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01'
        )
        assert self.get_error_type('post', '/transactions', data) == 'InvalidSplitAccount'

    def test_add_transaction_invalid_split_account(self):
        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitaccount1 = 'XXX'
        )
        assert self.get_error_type('post', '/transactions', data) == 'InvalidSplitAccount'
    
    def test_add_transaction_single_no_split_value(self):

        # this is test_accounts
        splitaccount1 = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitaccount1 = splitaccount1['guid'],
        )

        assert self.get_error_type('post', '/transactions', data) == 'InvalidSplitValue'

    def test_add_transaction_single_invalid_split_account(self):

        # this is test_accounts
        splitaccount1 = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitaccount1 = splitaccount1['guid'],
            splitvalue1 = '1.5'
        )

        assert self.get_error_type('post', '/transactions', data) == 'InvalidSplitAccount'

    def test_add_transaction_invalid_account_currency(self):

        # this is test_accounts
        splitaccount1 = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        splitaccount2 = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test 2',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        data = dict(
            currency = 'EUR',
            date_posted = '2018-01-01',
            splitaccount1 = splitaccount1['guid'],
            splitaccount2 = splitaccount2['guid'],
        )

        assert self.get_error_type('post', '/transactions', data) == 'InvalidSplitAccountCurrency'
    
    def test_add_transaction_identical_split_account(self):
        # Gnucash does allow a transaction to be across the same accounts so this test is correct!

        # this is test_accounts
        splitaccount1 = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        splitaccount2 = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test 2',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitaccount1 = splitaccount1['guid'],
            splitvalue1 = '1.5',
            splitaccount2 = splitaccount2['guid'],
            splitvalue2 = '1.5',
        )

        # Errors with 20:11:22  CRIT <gnc.backend.dbi> [mysql_error_fn()] DBI error: 1292: Incorrect datetime value: '19700101000000' for column 'reconcile_date' at row 1
        # Due to https://bugzilla.gnome.org/show_bug.cgi?id=784623
        # Worked around by adding the following to mysqld.cnf
        # sql_mode=ONLY_FULL_GROUP_BY,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION

        assert self.app.post('/transactions', data=data).status == '201 CREATED'

    def test_get_transaction_no_transaction(self):

        assert self.app.get('/transactions/none', data=dict()).status == '404 NOT FOUND'

    def test_get_transaction(self):

        # this is test_accounts
        splitaccount1 = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        splitaccount2 = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test 2',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitaccount1 = splitaccount1['guid'],
            splitvalue1 = '1.5',
            splitaccount2 = splitaccount2['guid'],
            splitvalue2 = '1.5',
            description = 'Test transaction',
            num = '0000001'
        )

        # Errors with 20:11:22  CRIT <gnc.backend.dbi> [mysql_error_fn()] DBI error: 1292: Incorrect datetime value: '19700101000000' for column 'reconcile_date' at row 1
        # Due to https://bugzilla.gnome.org/show_bug.cgi?id=784623
        # Worked around by adding the following to mysqld.cnf
        # sql_mode=ONLY_FULL_GROUP_BY,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION

        response = json.loads(self.clean(self.app.post('/transactions', data=data).data))

        transaction = json.loads(self.clean(self.app.get('/transactions/' +  response['guid'], data=dict()).data))

        assert transaction['description'] == 'Test transaction'

    def test_update_transaction_invalid_guid(self):
        assert self.get_error_type('post', '/transactions/' + '00000000000000000000000000000000', dict()) == 'InvalidTransactionGuid'

    def test_update_transaction_no_data(self):
        assert self.get_error_type('post', '/transactions/' + self.createTransactionGuid(), data=dict()) == 'InvalidTransactionCurrency'

    def test_update_transaction_no_currency(self):
        data = dict(
            currency = 'XYZ'
        )

        assert self.get_error_type('post', '/transactions/' + self.createTransactionGuid(), data=data) == 'InvalidTransactionCurrency'

    def test_update_transaction_invalid_currency(self):
        data = dict(
            currency = 'GBP',
            date_posted = 'XXX'
        )

        assert self.get_error_type('post', '/transactions/' + self.createTransactionGuid(), data=data) == 'InvalidDatePosted'

    def test_update_transaction_no_split_guid(self):
        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01'
        )
        assert self.get_error_type('post', '/transactions/' + self.createTransactionGuid(), data=data) == 'InvalidSplitGuid'

    def test_update_transaction_invalid_split_guid(self):
        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitguid1 = 'XXX'
        )
        assert self.get_error_type('post', '/transactions/' + self.createTransactionGuid(), data=data) == 'InvalidSplitGuid'

    def test_update_transaction_no_split_account(self):
        transaction = self.createTransaction()

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitguid1 = transaction['splits'][0]['guid'],
            splitguid2 = transaction['splits'][0]['guid']
        )

        assert self.get_error_type('post', '/transactions/' + transaction['guid'], data=data) == 'InvalidSplitAccount'

    def test_update_transaction_invalid_split_account(self):
        transaction = self.createTransaction()

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitguid1 = transaction['splits'][0]['guid'],
            splitguid2 = transaction['splits'][0]['guid'],
            splitaccount1 = 'XXX'
        )

        assert self.get_error_type('post', '/transactions/' + transaction['guid'], data=data) == 'InvalidSplitAccount'

    def test_update_transaction_invalid_split(self):

        # this is test_accounts
        splitaccount1 = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        splitaccount2 = json.loads(self.clean(self.app.post('/accounts', data=dict(
            name = 'Test 2',
            currency  = 'GBP',
            account_type_id = '2'
        )).data))

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitaccount1 = splitaccount1['guid'],
            splitaccount2 = splitaccount2['guid'],
            splitguid1 = '00000000000000000000000000000000',
            splitguid2 = '00000000000000000000000000000001'

        )

        assert self.get_error_type('post', '/transactions/' + self.createTransactionGuid(), data=data) == 'InvalidSplitGuid'

    def test_update_transaction_single_invalid_split_account(self):
        transaction = self.createTransaction()

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitaccount1 = transaction['splits'][0]['account']['guid'],
            splitguid1 = transaction['splits'][0]['guid'],
            splitvalue1 = '1.5',
            splitguid2 = transaction['splits'][0]['guid'],
            splitvalue2 = '1.5'
        )
        
        assert self.get_error_type('post', '/transactions/' + transaction['guid'], data=data) == 'InvalidSplitAccount'

    def test_update_transaction_duplicate_split_guid(self):

        transaction = self.createTransaction()

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitaccount1 = transaction['splits'][0]['account']['guid'],
            splitaccount2 = transaction['splits'][1]['account']['guid'],
            splitguid1 = transaction['splits'][0]['guid'],
            splitvalue1 = '1.5',
            splitguid2 = transaction['splits'][0]['guid'],
            splitvalue2 = '1.5'
        )

        assert self.get_error_type('post', '/transactions/' + transaction['guid'], data=data) == 'DuplicateSplitGuid'

    def test_update_transaction_no_split_value(self):

        transaction = self.createTransaction()

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitaccount1 = transaction['splits'][0]['account']['guid'],
            splitaccount2 = transaction['splits'][1]['account']['guid'],
            splitguid1 = transaction['splits'][0]['guid'],
            splitguid2 = transaction['splits'][1]['guid'],
            splitvalue1 = '',

        )

        assert self.get_error_type('post', '/transactions/' + transaction['guid'], data=data) == 'InvalidSplitValue'

    def test_update_transaction_invalid_split_value(self):

        transaction = self.createTransaction()

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitaccount1 = transaction['splits'][0]['account']['guid'],
            splitaccount2 = transaction['splits'][1]['account']['guid'],
            splitguid1 = transaction['splits'][0]['guid'],
            splitguid2 = transaction['splits'][1]['guid'],
            splitvalue1 = 'A',

        )

        assert self.get_error_type('post', '/transactions/' + transaction['guid'], data=data) == 'InvalidSplitValue'

    def test_update_transaction_no_split_value2(self):

        transaction = self.createTransaction()

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitaccount1 = transaction['splits'][0]['account']['guid'],
            splitaccount2 = transaction['splits'][1]['account']['guid'],
            splitguid1 = transaction['splits'][0]['guid'],
            splitguid2 = transaction['splits'][1]['guid'],
            splitvalue1 = '0.5',
            splitvalue2 = '',

        )

        assert self.get_error_type('post', '/transactions/' + transaction['guid'], data=data) == 'InvalidSplitValue'

    def test_update_transaction_invalid_split_value2(self):

        transaction = self.createTransaction()

        data = dict(
            currency = 'GBP',
            date_posted = '2018-01-01',
            splitaccount1 = transaction['splits'][0]['account']['guid'],
            splitaccount2 = transaction['splits'][1]['account']['guid'],
            splitguid1 = transaction['splits'][0]['guid'],
            splitguid2 = transaction['splits'][1]['guid'],
            splitvalue1 = '0.5',
            splitvalue2 = 'A',

        )

        assert self.get_error_type('post', '/transactions/' + transaction['guid'], data=data) == 'InvalidSplitValue'

    def test_update_transaction_invalid_account_currency(self):

        transaction = self.createTransaction()

        data = dict(
            currency = 'EUR',
            date_posted = '2018-01-01',
            splitaccount1 = transaction['splits'][0]['account']['guid'],
            splitaccount2 = transaction['splits'][1]['account']['guid'],
            splitguid1 = transaction['splits'][0]['guid'],
            splitguid2 = transaction['splits'][1]['guid'],
            splitvalue1 = '0.5',
            splitvalue2 = '0.5',
        )

        assert self.get_error_type('post', '/transactions/' + transaction['guid'], data=data) == 'InvalidSplitAccountCurrency'
    
    def test_update_transaction(self):

        transaction = self.createTransaction()

        data = dict(
            currency = 'GBP',
            description = 'Updated test transaction',
            date_posted = '2018-01-01',
            splitaccount1 = transaction['splits'][0]['account']['guid'],
            splitaccount2 = transaction['splits'][1]['account']['guid'],
            splitguid1 = transaction['splits'][0]['guid'],
            splitguid2 = transaction['splits'][1]['guid'],
            splitvalue1 = '0.5',
            splitvalue2 = '0.5',

        )

        response = json.loads(self.clean(self.app.post('/transactions/' + transaction['guid'], data=data).data))

        assert response['description'] == 'Updated test transaction'

    def test_delete_transaction_invalid_guid(self):
        assert self.get_error_type('delete', '/transactions/XXX', data=dict()) == 'NoTransaction'

    def test_delete_transaction(self):
        transaction = self.createTransaction()

        self.app.delete('/transactions/' + transaction['guid'], data=dict())

        assert self.app.get('/transactions/' + transaction['guid']).status == '404 NOT FOUND'

class VendorsTestCase(ApiTestCase):

    def test_vendors_no_session(self):
        assert self.get_error_type('get', '/vendors', dict()) == 'SessionDoesNotExist'

class VendorsSessionTestCase(ApiSessionTestCase):

    def test_add_vendor_no_parameters(self):
        assert self.get_error_type('post', '/vendors', dict()) == 'NoVendorName'

    def test_add_vendor_no_address(self):
        data = dict(
            name = 'Test vendor'
        )

        assert self.get_error_type('post', '/vendors', data=data) == 'NoVendorAddress'

    def test_add_vendor_no_currency(self):
        data = dict(
            name = 'Test vendor',
            address_line_1 = 'Test address'
        )

        assert self.get_error_type('post', '/vendors', data=data) == 'InvalidVendorCurrency'

    def test_add_vendor_invalid_currency(self):
        data = dict(
            name = 'Test vendor',
            address_line_1 = 'Test address',
            currency = 'XYZ'
        )

        assert self.get_error_type('post', '/vendors', data=data) == 'InvalidVendorCurrency'

    def test_vendors_no_id(self):

        data = dict(
            name = 'Test vendor',
            address_line_1 = 'Test address',
            currency = 'GBP'
        )

        assert self.app.post('/vendors', data=data).status == '201 CREATED'

    def test_vendors_empty_id(self):
        data = dict(
            id = '',
            name = 'Test vendor',
            address_line_1 = 'Test address',
            currency = 'GBP'
        )

        assert self.app.post('/vendors', data=data).status == '201 CREATED'

    def test_get_vendors(self):

        # Logs in Python 3
        # WARN <qof.class> [qof_class_get_parameter()] no object of type 
        # WARN <qof.class> [qof_class_get_parameter()] no object of type
        # CRIT <qof.object> [qof_object_foreach()] No object of type

        assert self.clean(self.app.get('/vendors').data) == '[]'

class BillsTestCase(ApiTestCase):

    def test_bills_no_session(self):
        assert self.get_error_type('get', '/bills', dict()) == 'SessionDoesNotExist'

class BillsSessionTestCase(ApiSessionTestCase):

    def test_bills_no_parameters(self):
        assert self.clean(self.app.get('/bills').data) == '[]'

    # add_bill
    #def test_bills(self):
    #    print self.app.post('/bills').data

    #def test_bills(self):
    #    print self.app.get('/bills?is_paid=X').data

if __name__ == '__main__':
    unittest.main()