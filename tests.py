import unittest
import json
import gnucash_rest
import MySQLdb

class Test(unittest.TestCase):

    def setUp(self):
        self.app = gnucash_rest.app.test_client()
        self.app.testing = True

        database = MySQLdb.connect(host='localhost', user='root', passwd='oxford')
        cursor = database.cursor()
        sql = 'CREATE DATABASE test'
        cursor.execute(sql)

    def tearDown(self):
        database = MySQLdb.connect(host='localhost', user='root', passwd='oxford')
        cursor = database.cursor()
        sql = 'DROP DATABASE test'
        cursor.execute(sql)

    def get_error_type(self, method, url, data):
        if method is 'get':
            response = self.app.get(url)
        elif method is 'post':
            response = self.app.post(url, data=data)
        else:
            raise ValueError('unknown method in assert_error_type')

        if response.status == '400 BAD REQUEST':
            json_response = json.loads(response.data)
            return json_response['errors'][0]['type']
        else:
            raise ValueError('Non 400 error code: ' + response.status)

    def test_root(self):
        response = self.app.get('/')
        assert response.data == '"Gnucash REST API"'

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

    def test_session_connection_isnew(self):
        data = dict(
            connection_string = 'mysql://root:oxford@localhost/test',
            is_new='1'
        )
        assert self.get_error_type('post', '/session', data) == 'InvalidIgnoreLock'

    def test_session_connection(self):
        data = dict(
            connection_string = 'mysql://root:oxford@localhost/test',
            is_new = '1',
            ignore_lock = '0'
        )

        # Logs
        # * 11:18:00  WARN <gnc.backend.dbi> [gnc_dbi_unlock()] No lock table in database, so not unlocking it.

        # 201 CREATED
        response = self.app.post('/session', data=data)
        assert response.data == '"Session started"'

if __name__ == '__main__':
    unittest.main()