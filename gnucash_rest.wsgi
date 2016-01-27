#!/usr/bin/python
import sys
import logging
logging.basicConfig(stream=sys.stderr)
sys.path.insert(0,"/home/tom/wsgi_new/")

from gnucash_rest import app as application
application.connection_string = 'mysql://root:oxford@192.168.56.1/gnucash_test_studential'

