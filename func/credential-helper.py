#!/usr/bin/python

# CloudBriefly.com

from __future__ import print_function
from datetime import datetime
import hashlib
import hmac
import urllib2
import json
import sys
import ConfigParser
import StringIO

def sign(key, message):
    return hmac.new(key, message.encode('utf-8'), hashlib.sha256).digest()

def generate_codecommit_repo_credentials():
    now = datetime.utcnow()
    amz_date = now.strftime('%Y%m%dT%H%M%S')
    date_stamp = now.strftime('%Y%m%d')

    # Query for temporary AWS credentials
    metadata_url = 'http://169.254.169.254/latest/meta-data/iam/security-credentials/'
    iam_role = urllib2.urlopen(metadata_url).read()
    credentials = json.load(urllib2.urlopen(metadata_url + iam_role))

    # Parameteres passed by the command-line Git client
    git_parameters = ConfigParser.ConfigParser()
    git_parameters.readfp(StringIO.StringIO('[repo]\n' + sys.stdin.read()))
    host = git_parameters.get('repo', 'host').split(':')[0]
    path = git_parameters.get('repo', 'path')

    region = host.split('.')[1]

    # Generate the username and password for the CodeCommit repository
    credential_scope = '%s/%s/codecommit/aws4_request' % (date_stamp, region)
    canonical_request = 'GIT\n/%s\n\nhost:%s\n\nhost\n' % (path, host)
    string_to_sign = 'AWS4-HMAC-SHA256\n%s\n%s\n%s' % (
        amz_date, credential_scope,
        hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()
    )
    signing_key = \
        sign(sign(sign(sign(('AWS4' + credentials['SecretAccessKey']).encode('utf-8'),
                            date_stamp),
                       region),
                  'codecommit'),
             'aws4_request')
    signature = hmac.new(signing_key, (string_to_sign).encode('utf-8'),
                         hashlib.sha256).hexdigest()

    print('username=%s%%%s' % (credentials['AccessKeyId'], credentials['Token']))
    print('password=%sZ%s' % (amz_date, signature))

generate_codecommit_repo_credentials()