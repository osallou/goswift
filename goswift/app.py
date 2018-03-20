import ssl
import os
import yaml
import logging
import requests
import urllib
from functools import wraps
import hmac
from hashlib import sha1
from time import time
import crypt
import uuid
import re

import smtplib
from email.message import EmailMessage

import humanfriendly

import pymongo
from pymongo import MongoClient
from pymongo import DESCENDING as pyDESCENDING

from flask import Flask
from flask import jsonify
from flask import request
from flask import abort
from flask import Response

from flask_cors import CORS, cross_origin

from elasticsearch import Elasticsearch

from goswift import version

config_file = 'config.yml'
if 'GOSWIFT_CONFIG' in os.environ:
  config_file = os.environ['GOSWIFT_CONFIG']

config = None
with open(config_file, 'r') as ymlfile:
    config = yaml.load(ymlfile)

def override_config():
    if 'GOSWIFT_DEBUG' in os.environ and os.environ['GOSWIFT_DEBUG']:
        config['debug'] = os.environ['GOSWIFT_DEBUG']
    if 'GOSWIFT_SALT_SECRET' in os.environ and os.environ['GOSWIFT_SALT_SECRET']:
        config['salt_secret'] = os.environ['GOSWIFT_SALT_SECRET']
    if 'GOSWIFT_SWIFT_KEYSTONE_URL' in os.environ and os.environ['GOSWIFT_SWIFT_KEYSTONE_URL']:
        config['swift']['keystone_url'] = os.environ['GOSWIFT_SWIFT_KEYSTONE_URL']
    if 'GOSWIFT_SWIFT_SWIFT_URL' in os.environ and os.environ['GOSWIFT_SWIFT_SWIFT_URL']:
        config['swift']['swift_url'] = os.environ['GOSWIFT_SWIFT_SWIFT_URL']

    if 'GOSWIFT_SWIFT_ADMIN_OS_USER_ID' in os.environ and os.environ['GOSWIFT_SWIFT_ADMIN_OS_USER_ID']:
        config['swift']['admin']['os_user_id'] = os.environ['GOSWIFT_SWIFT_ADMIN_OS_USER_ID']
    if 'GOSWIFT_SWIFT_ADMIN_OS_USER_PASSWORD' in os.environ and os.environ['GOSWIFT_SWIFT_ADMIN_OS_USER_PASSWORD']:
        config['swift']['admin']['os_user_password'] = os.environ['GOSWIFT_SWIFT_ADMIN_OS_USER_PASSWORD']
    if 'GOSWIFT_SWIFT_ADMIN_OS_USER_PROJECT' in os.environ and os.environ['GOSWIFT_SWIFT_ADMIN_OS_USER_PROJECT']:
        config['swift']['admin']['os_user_project'] = os.environ['GOSWIFT_SWIFT_ADMIN_OS_USER_PROJECT']
    if 'GOSWIFT_SWIFT_ADMIN_OS_USER_DOMAIN' in os.environ and os.environ['GOSWIFT_SWIFT_ADMIN_OS_USER_DOMAIN']:
        config['swift']['admin']['os_user_domain'] = os.environ['GOSWIFT_SWIFT_ADMIN_OS_USER_DOMAIN']

    if 'GOSWIFT_SWIFT_DEFAULTS_DOMAIN' in os.environ and os.environ['GOSWIFT_SWIFT_DEFAULTS_DOMAIN']:
        config['swift']['defaults']['domain'] = os.environ['GOSWIFT_SWIFT_DEFAULTS_DOMAIN']

    if 'GOSWIFT_SWIFT_QUOTAS' in os.environ and os.environ['GOSWIFT_SWIFT_QUOTAS']:
        config['swift']['quotas'] = os.environ['GOSWIFT_SWIFT_QUOTAS']

    if 'GOSWIFT_ELASTIC_HOST' in os.environ and os.environ['GOSWIFT_ELASTIC_HOST']:
        config['elastic']['hosts'] = [os.environ['GOSWIFT_ELASTIC_HOST']]

    if 'GOSWIFT_MONGO_URL' in os.environ and os.environ['GOSWIFT_MONGO_URL']:
        config['mongo']['url'] = os.environ['GOSWIFT_MONGO_URL']

    if 'GOSWIFT_ADMIN_LIST' in os.environ and os.environ['GOSWIFT_ADMIN_LIST']:
        admin_list = os.environ['GOSWIFT_ADMIN_LIST']
        config['admin'] = [x.strip() for x in admin_list.split(',')]

    if 'GOSWIFT_SMTP_HOST' in os.environ and os.environ['GOSWIFT_SMTP_HOST']:
        config['smtp']['host'] = os.environ['GOSWIFT_SMTP_HOST']
    if 'GOSWIFT_SMTP_PORT' in os.environ and os.environ['GOSWIFT_SMTP_PORT']:
        config['smtp']['port'] = int(os.environ['GOSWIFT_SMTP_PORT'])
    if 'GOSWIFT_SMTP_FROM' in os.environ and os.environ['GOSWIFT_SMTP_FROM']:
        config['smtp']['from'] = int(os.environ['GOSWIFT_SMTP_FROM'])

    if 'GOSWIFT_HOST_HREF' in os.environ and os.environ['GOSWIFT_HOST_HREF']:
        config['host_href'] = os.environ['GOSWIFT_HOST_HREF']

override_config()

if config['debug']:
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s %(module)s:%(filename)s %(levelname)s %(message)s'
    )
else:
    logging.basicConfig(
        format='%(asctime)s %(module)s:	%(filename)s %(levelname)s %(message)s'
    )

MIME_TYPE_JSON = 'application/json'
MIME_TYPE_JSON_HOME = 'application/json-home'
MEDIA_TYPE_JSON = 'application/vnd.openstack.key-manager-%s+json'

es = None
if config['elastic']['hosts']:
    es = Elasticsearch(
        config['elastic']['hosts'],
        # sniff before doing anything
        sniff_on_start=True,
        # refresh nodes after a node fails to respond
        sniff_on_connection_fail=True,
        # and also every 60 seconds
        sniffer_timeout=60
    )
    es.indices.create(index=config['elastic']['index'], ignore=400)

mongo = MongoClient(config['mongo']['url'])
mongo_db = mongo[config['mongo']['db']]
db_quota = mongo_db.quotas
db_hooks = mongo_db.hooks
db_hook = mongo_db.hook


def _get_base_url_from_request():
    if not config['host_href'] and hasattr(request, 'url'):
        p_url = urllib.parse.urlsplit(request.url)
        base_url = '%s://%s' % (p_url.scheme, p_url.netloc)
        '''
        if p_url.path:
            base_url = '%s://%s%s' % (p_url.scheme, p_url.netloc, p_url.path)
        else:
            base_url = '%s://%s' % (p_url.scheme, p_url.netloc)
        '''
        return base_url
    else:
        return config['host_href']

def _get_versioned_url(version):
    if version[-1] != '/':
        version += '/'
    # If host_href is not set in conf,
    # then derive it from request url
    host_part = _get_base_url_from_request()
    if host_part[-1] != '/':
        host_part += '/'
    return urllib.parse.urljoin(host_part, 'api', version)


class BaseVersionController(object):

    @classmethod
    def get_version_info(cls):
        return {
            'id': cls.version_id,
            'status': 'stable',
            'updated': cls.last_updated,
            'links': [
                {
                    'rel': 'self',
                    'href': _get_versioned_url(cls.version_string),
                }, {
                    'rel': 'describedby',
                    'type': 'text/html',
                    'href': 'https://github.com/osallou/goswift'
                }
            ],
            'media-types': [
                {
                    'base': MIME_TYPE_JSON,
                    'type': MEDIA_TYPE_JSON % cls.version_string
                }
            ]
        }


class V1Controller(BaseVersionController):

    version_string = 'v1'

    version_id = 'v1'

    last_updated = '2018-01-11T00:00:00Z'

    def __init__(self):
        logging.debug('=== V1Controller ===')


AVAILABLE_VERSIONS = {
    V1Controller.version_string: V1Controller,
}

DEFAULT_VERSION = V1Controller.version_string

app = Flask(__name__)
CORS(app, expose_headers=['X-Container-Bytes-Used', 'X-Container-Object-Count', 'X-Auth-Token'])

def get_token(data):
    auth = {
        'auth': {
            'scope':
                {'project': {
                    'name': data['project'],
                    'domain':
                        {
                            'name': data['domain']
                        }
                    }
                 },
            'identity': {
                    'password': {
                        'user': {
                            'domain': {
                                'name': data['domain']
                            },
                            'password': data['password'],
                            'name': data['user']
                        }
                    },
                    'methods': ['password']
                }
        }
    }

    token = None

    try:
        ks_url = config['swift']['keystone_url'] + '/auth/tokens'
        r = requests.post(ks_url, json=auth)
        if not r.status_code == 201:
            logging.info('Authentication failed: %s' + str(data['user']))
            abort(401)
        token = r.headers['X-Subject-Token']
    except Exception:
        logging.exception('Failed to get token for ' + data['user'])
        return None
    return token


def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'X-Auth-Token' not in request.headers:
            abort(401)
        return f(*args, **kwargs)
    return decorated

@app.route('/api/<apiversion>/ping', methods=['GET'])
def ping(apiversion):
    return jsonify({'msg': 'pong'})

@app.route('/api', methods=['GET'])
def versions():
    versions_info = [version_class.get_version_info() for
                     version_class in AVAILABLE_VERSIONS.values()]

    version_output = {
        'versions': {
            'values': versions_info
        }
    }
    return jsonify(version_output)


@app.route('/api/<apiversion>', methods=['GET'])
def version(apiversion):
    if apiversion not in AVAILABLE_VERSIONS:
        abort(404)
    vController = AVAILABLE_VERSIONS[apiversion]()
    return jsonify({'version': vController.get_version_info()})

@app.route('/api/<apiversion>/reauth/<project>', methods=['GET'])
@requires_auth
def reauthenticate(apiversion, project):

    auth = {
        "auth": {
            "identity": {
                "methods": [
                    "token"
                ],
                "token": {
                    "id": request.headers['X-Auth-Token']
                }
            },
            "scope": {
                "project": {
                    "id": project
                }
            }
        }
    }
    token = None

    try:
        ks_url = config['swift']['keystone_url'] + '/auth/tokens'
        r = requests.post(ks_url, json=auth)
        if not r.status_code == 201:
            logging.info('Reauthentication failed')
            abort(401)
        token = r.headers['X-Subject-Token']
        r_json = r.json()
        project_id = r_json['token']['project']['id']

    except Exception as e:
        logging.exception('Failed to authenticate with Keystone')
        abort(401)

    return jsonify({'token': token, 'project': project_id})

@app.route('/api/<apiversion>/auth', methods=['POST'])
def authenticate(apiversion):
    data = request.get_json()
    logging.info(str(data))
    if not data or 'user' not in data or 'password' not in data or 'project' not in data:
        abort(401)

    if 'domain' not in data:
        data['domain'] = config['swift']['defaults']['domain']

    auth = {
        'auth': {
            'scope':
                {'project': {
                    'name': data['project'],
                    'domain':
                        {
                            'name': data['domain']
                        }
                    }
                 },
            'identity': {
                    'password': {
                        'user': {
                            'domain': {
                                'name': data['domain']
                            },
                            'password': data['password'],
                            'name': data['user']
                        }
                    },
                    'methods': ['password']
                }
        }
    }

    token = None

    try:
        ks_url = config['swift']['keystone_url'] + '/auth/tokens'
        r = requests.post(ks_url, json=auth)
        if not r.status_code == 201:
            logging.info('Authentication failed: %s' % str(data['user']))
            abort(401)
        token = r.headers['X-Subject-Token']
        r_json = r.json()
        project_id = r_json['token']['project']['id']
        is_admin = False
        if 'roles' in r_json['token']:
            for role in r_json['token']['roles']:
                if role['name'] == 'admin':
                    is_admin = True

    except Exception as e:
        logging.exception('Failed to authenticate with Keystone')
        abort(401)

    return jsonify({'token': token, 'project': project_id, 'is_admin': is_admin})

@app.route('/api/<apiversion>/project/<project>', methods=['GET'])
@requires_auth
def get_project_containers(apiversion, project):
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
    }
    r = requests.get(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) +'?format=json', headers=headers)
    if r.status_code not in [200]:
        abort(r.status_code)
    url = config['swift']['swift_url'] + '/v1/AUTH_' + str(project)
    quota_value = int(humanfriendly.parse_size(config['swift']['quotas'], binary=True))
    quota = db_quota.find_one({'id': project})
    if quota:
        quota_value = quota['quota']
    return jsonify({'containers': r.json(), 'swift_url': url, 'quota': quota_value})


@app.route('/api/<apiversion>/cors/<project>/<container>', methods=['POST'])
def set_cors(apiversion, project, container):
    # Set CORS for container
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
        'X-Container-Meta-Access-Control-Allow-Origin': '*',
        'X-Container-Meta-Access-Control-Expose-Headers': 'Content-Length,X-Object-Manifest'
    }
    r = requests.post(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container , headers=headers)
    if r.status_code != 204:
        abort(r.status_code)

    return jsonify({'msg': 'done'})

@app.route('/api/<apiversion>/project/<project>/<container>', methods=['POST'])
@requires_auth
def create_project_containers(apiversion, project, container):
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
    }
    r = requests.put(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container +'?format=json', headers=headers)
    if r.status_code not in [201, 202]:
        abort(r.status_code)

    __set_quotas(project)
    '''
    # Set quota for user project
    if config['swift']['quotas']:
        admin_token = get_token({
            'user': config['swift']['admin']['os_user_id'],
            'password': config['swift']['admin']['os_user_password'],
            'domain': config['swift']['admin']['os_user_domain'],
            'project': config['swift']['admin']['os_user_project']
        })

        if admin_token:
            headers = {
                'X-Auth-Token': admin_token,
                'X-Account-Meta-Quota-Bytes': str(humanfriendly.parse_size(config['swift']['quotas']))
            }
            r = requests.post(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) , headers=headers)
            if r.status_code not in [200, 204]:
                logging.error('Quota error for ' + str(project) + ':' + r.text)
                #abort(r.status_code)
    '''

    # Set CORS for container
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
        'X-Container-Meta-Access-Control-Allow-Origin': '*',
        'X-Container-Meta-Access-Control-Expose-Headers': 'Content-Length,X-Object-Manifest'
    }
    r = requests.post(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container , headers=headers)
    if r.status_code != 204:
        abort(r.status_code)

    return jsonify({'msg': 'container created'})


def get_tempurl(token, method, project, container, filepath):
    duration_in_seconds = 3600 * 24 * 30 # 30 days
    expires = int(time() + duration_in_seconds)
    path = '/v1/AUTH_' + project + '/' + container + '/' + str(filepath)
    url_path = '/v1/AUTH_' + project + '/' + container + '/' + urllib.parse.quote(str(filepath))
    key = crypt.crypt(project,'$6$' + config['salt_secret']).encode('utf-8')
    headers = {
        'X-Auth-Token': token,
        'X-Account-Meta-Temp-URL-Key': key,
    }
    r = requests.post(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) , headers=headers)
    if not r.status_code == 204:
        return None
    hmac_body = '%s\n%s\n%s' % (method, expires, path)
    sig = hmac.new(key, hmac_body.encode('utf-8'), sha1).hexdigest()
    s = '{host}/{path}?temp_url_sig={sig}&temp_url_expires={expires}'
    tmpurl = s.format(host=config['swift']['swift_url'], path=url_path, sig=sig, expires=expires)
    return tmpurl

@app.route('/api/<apiversion>/project/<project>/<container>/<path:filepath>', methods=['GET'])
@requires_auth
def download_via_tempurl(apiversion, project, container, filepath):
    ks_url = config['swift']['keystone_url'] + '/auth/tokens'
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
        'X-Subject-Token': request.headers['X-Auth-Token']
    }
    r = requests.get(ks_url, headers=headers)
    if not r.status_code == 200:
        abort(r.status_code)
    r_json = r.json()
    if r_json['token']['project']['id'] != project:
        abort(403)

    method = request.args.get('method', 'GET')
    token = request.headers['X-Auth-Token']
    tmpurl = get_tempurl(token, method, project, container, filepath)
    if not tmpurl:
        abort(500)
    return jsonify({'url': tmpurl})



@app.route('/api/<apiversion>/project/<project>/<container>', methods=['HEAD'])
@requires_auth
def get_project_container_meta(apiversion, project, container):
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
    }
    # Get container info
    r = requests.head(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container+'?format=json' , headers=headers)
    if r.status_code != 204:
        abort(r.status_code)
    res = []
    resp = Response("")
    for res_header in list(r.headers.keys()):
        if res_header.startswith('X-Container-'):
            resp.headers[res_header] = r.headers[res_header]
    return resp

@app.route('/api/<apiversion>/project/<project>/<container>', methods=['GET'])
@requires_auth
def get_project_container(apiversion, project, container):
    '''
    Set quotas and CORS

    # Set quota for user project
    '''
    __set_quotas(project)

    # Set CORS for container
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
        'X-Container-Meta-Access-Control-Allow-Origin': '*',
        'X-Container-Meta-Access-Control-Expose-Headers': 'Content-Length,X-Object-Manifest,X-Container-Bytes-Used,X-Container-Object-Count'
    }
    r = requests.post(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container , headers=headers)
    if r.status_code != 204:
        abort(r.status_code)

    return jsonify({'url': config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container})


@app.route('/api/<apiversion>/index/project/<project>/<container>/<path:filepath>', methods=['DELETE'])
@requires_auth
def delete_index_container(apiversion, project, container, filepath):
    if not es:
        abort(403)
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
    }
    r = requests.head(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container+'?format=json' , headers=headers)
    if r.status_code != 204:
        abort(r.status_code)
    docid = project+'_'+container+'_'+filepath.replace('/','_')
    try:
        es.delete(index=config['elastic']['index'] +'-' + project, doc_type='swift', id=docid, body=doc)
    except Exception as e:
        logging.error('Deletion error: ' + str(e))
    return jsonify({'msg': 'ok'})


@app.route('/api/<apiversion>/search/project/<project>/<container>', methods=['POST'])
@requires_auth
def search_index_container(apiversion, project, container):
    if not es:
        abort(403)
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
    }
    r = requests.head(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container+'?format=json' , headers=headers)
    if r.status_code != 204:
        abort(r.status_code)
    data = request.get_json()
    # data['query'] : Lucene syntax
    res = None
    try:
        res = es.search(index=config['elastic']['index'] + '-' + project, q=data['query'], size=1000)
    except Exception as e:
        logging.error('Search error: ' + str(e))
        res = {'hits': {'hits': []}}
    return jsonify(res)


def __set_quotas(project):
    project_quota = humanfriendly.parse_size(config['swift']['quotas'], binary=True)

    for i in range(5):
        try:
            quota = db_quota.find_one({'id': project})
            if quota:
                project_quota = quota['quota']
            break
        except pymongo.errors.AutoReconnect:
            logger.warn('Mongo:AutoReconnect')
            time.sleep(pow(2, i))

    logging.debug('Set quota for project %s at %s' % (project, str(project_quota)))
    if project_quota:
        admin_token = get_token({
            'user': config['swift']['admin']['os_user_id'],
            'password': config['swift']['admin']['os_user_password'],
            'domain': config['swift']['admin']['os_user_domain'],
            'project': config['swift']['admin']['os_user_project']
        })

        if admin_token:
            headers = {
                'X-Auth-Token': admin_token,
                'X-Account-Meta-Quota-Bytes': str(project_quota)
            }
            r = requests.post(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) , headers=headers)
            if r.status_code not in [200, 204]:
                logging.error('Quota error for ' + str(project) + ':' + r.text)

def compare_name(a):
    return a['name']

@app.route('/api/<apiversion>/quota', methods=['GET'])
def get_projects_quota(apiversion):
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
        'X-Subject-Token': request.headers['X-Auth-Token']
    }
    ks_url = config['swift']['keystone_url'] + '/auth/tokens'
    r = requests.get(ks_url, headers=headers)
    if not r.status_code == 200:
        abort(r.status_code)
    ks_token = r.json()
    user = ks_token['token']['user']['name']
    if user not in config['admin']:
        abort(403)


    projects = []
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token']
    }
    ks_url = config['swift']['keystone_url'] + '/projects'
    r = requests.get(ks_url, headers=headers)
    if not r.status_code == 200:
        abort(r.status_code)
    ks_projects = r.json()['projects']

    quotas = db_quota.find()
    quotas_map = {}
    for quota in quotas:
        quotas_map[quota['id']] = quota['quota']
        # projects.append({'id': quota['id'], 'name': project_map[quota['id']], 'quota': quota['quota']})
    for project in ks_projects:
        if project['id'] in quotas_map:
            project['quota'] = quotas_map[project['id']]
        else:
            project['quota'] = humanfriendly.parse_size(config['swift']['quotas'], binary=True)
        projects.append({'id': project['id'], 'name': project['name'], 'quota': project['quota']})

    # projects.sort(key=compare_name)
    return jsonify({'projects': projects})

@app.route('/api/<apiversion>/quota/project/<project>', methods=['POST'])
def update_project_quota(apiversion, project):
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
        'X-Subject-Token': request.headers['X-Auth-Token']
    }
    ks_url = config['swift']['keystone_url'] + '/auth/tokens'
    r = requests.get(ks_url, headers=headers)
    if not r.status_code == 200:
        abort(r.status_code)
    ks_token = r.json()
    user = ks_token['token']['user']['name']
    if user not in config['admin']:
        abort(403)

    data = request.get_json()
    quota = db_quota.find_one({'id': project})
    if quota:
        db_quota.update({'id': project},{'$set': {'quota': humanfriendly.parse_size(data['quota'], binary=True)}})
    else:
        db_quota.insert({'id': project, 'quota': humanfriendly.parse_size(data['quota'], binary=True)})
    __set_quotas(project)
    return jsonify({'project': project, 'quota': data['quota']})


def run_hook(request, project, container, filepath, apiversion='v1', force=False):
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
    }
    result = True
    r = requests.head(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container+'?format=json' , headers=headers)
    if r.status_code != 204:
        abort(r.status_code)
    # Hooks
    hook = db_hooks.find_one({'project': project, 'bucket': container})
    if hook:
        if not force and 'regexp' in hook and hook['regexp']:
            if re.match(hook['regexp'], filepath) is None:
                return None
        uid = uuid.uuid4().hex
        token = request.headers['X-Auth-Token']
        method = request.args.get('method', 'GET')
        tmpurl = get_tempurl(token, method, project, container, filepath)
        data = {
            'bucket': container,
            'path': tmpurl,
            'orig_path': filepath,
            'id': uid,
            'callback': {
                'success': _get_base_url_from_request() + '/api/' + apiversion + '/hooks/' + uid + '/ok',
                'failure': _get_base_url_from_request() + '/api/' + apiversion + '/hooks/' + uid + '/ko'
            }
        }
        try:
            res = requests.post(hook['url'], headers=headers, json=data)
            status = None
            if not res.status_code == 200:
                status = False
            db_hook.insert({'id': uid, 'project': project, 'status': status, 'bucket': container, 'file': filepath})
        except Exception as e:
            logging.exception('Failed to send hook notification: ' + str(hook['url']))
            result = False
    else:
        result = None
    return result


@app.route('/api/<apiversion>/hook/<project>/<container>/<path:filepath>', methods=['POST'])
def test_hook_container(apiversion, project, container, filepath):
    res = run_hook(request, project, container, filepath, apiversion=apiversion, force=True)
    return jsonify({'msg': 'called hook', 'res': res})


@app.route('/api/<apiversion>/index/project/<project>/<container>/<path:filepath>', methods=['POST', 'PUT'])
def update_index_container(apiversion, project, container, filepath):
    logging.info("New document:"+str(project)+":"+str(container)+":"+filepath)
    __set_quotas(project)
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
    }
    run_hook(request, project, container, filepath, apiversion=apiversion)

    if not es:
        abort(403)

    r = requests.head(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container+'?format=json' , headers=headers)
    if r.status_code != 204:
        abort(r.status_code)
    docid = project+'_'+container+'_'+filepath.replace('/','_')
    metas =[]
    for header, value in request.headers.items():
        if header.startswith('X-Object-Meta-'):
            meta = {}
            meta[header.replace('X-Object-Meta-', '').lower()] = value
            metas.append(meta)
    doc = {
        'project': project,
        'container': container,
        'object': str(filepath).split('/'),
        'metadata': metas
    }
    es.indices.create(index=config['elastic']['index'] + '-' + project, ignore=400)
    es.index(index=config['elastic']['index'] + '-' + project, doc_type='swift', id=docid, body=doc)
    return jsonify({'msg': 'ok'})


@app.route('/api/<apiversion>/tempurl', methods=['POST'])
@requires_auth
def send_tmpurl_email(apiversion):
    data = request.get_json()
    if not config['smtp']['host'] or not data.get('emails', None):
        abort(403)

    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
        'X-Subject-Token': request.headers['X-Auth-Token']
    }
    ks_url = config['swift']['keystone_url'] + '/auth/tokens'
    r = requests.get(ks_url, headers=headers)
    if not r.status_code == 200:
        abort(r.status_code)
    ks_token = r.json()
    user = ks_token['token']['user']['name']

    msg = EmailMessage()
    msg.set_content(config['smtp']['share']['msg'].replace('#USER', user).replace('#URL', data['url']))
    msg['Subject'] = config['smtp']['share']['subject'].replace('#USER', user)
    msg['From'] = config['smtp']['from']
    msg['To'] = ','.join(data['emails'])

    # Send the message via our own SMTP server.
    s = smtplib.SMTP(host=config['smtp']['host'], port=config['smtp']['port'])
    s.send_message(msg)
    s.quit()
    return jsonify({'msg': 'invitation sent'})


@app.route('/api/<apiversion>/hook/<project>/<bucket>', methods=['GET'])
@requires_auth
def get_hook(apiversion, project,bucket):
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
    }
    r = requests.get(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) +'?format=json', headers=headers)
    if r.status_code not in [200]:
        abort(r.status_code)
    hook = db_hooks.find_one({'project': project, 'bucket': bucket})
    url = None
    if hook:
        url = hook['url']
    if 'regexp' not in hook:
        hook['regexp'] = ''
    return jsonify({'hook': url, 'regexp': hook['regexp']})


@app.route('/api/<apiversion>/hook/<project>/<bucket>', methods=['POST'])
@requires_auth
def set_hook(apiversion, project,bucket):
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
    }
    r = requests.get(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) +'?format=json', headers=headers)
    if r.status_code not in [200]:
        abort(r.status_code)
    data = request.get_json()
    hook = db_hooks.find_one({'project': project, 'bucket': bucket})

    if hook:
        db_hooks.update({'project': project, 'bucket': bucket},{'$set': {'url': data['url'], 'regexp': data['regexp']}})
    else:
        db_hooks.insert({'project': project, 'bucket': bucket, 'url': data['url'], 'regexp': data['regexp']})

    return jsonify({'hook': data['url'], 'regexp': data['regexp']})


@app.route('/api/<apiversion>/hook/<project>', methods=['GET'])
@requires_auth
def get_hook_status(apiversion, project):
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
    }
    r = requests.get(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) +'?format=json', headers=headers)
    if r.status_code not in [200]:
        abort(r.status_code)
    result = []
    hooks = db_hook.find({'project': project}).sort([('_id', pymongo.DESCENDING)]).limit(500)
    for hook in hooks:
        del hook['_id']
        result.append(hook)
    return jsonify({'hooks': result})


@app.route('/api/<apiversion>/hooks/<hookid>/<status>', methods=['POST'])
def set_hook_status(apiversion, hookid, status):
    '''
    Status can be set to 0,ko,false for failure, other is considered as success
    '''
    data = request.get_json()
    hook_status = True
    if status.lower() in ['0', 'ko', 'false']:
        hook_status = False
    db_hook.update({'id': hookid},{'$set': {'status': hook_status, 'info': data}})
    return jsonify({'status': status})


if __name__ == "__main__":
    context = None
    if config['tls']['cert']:
        context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
        context.load_cert_chain(config['tls']['cert'], config['tls']['key'])
    app.run(host=config['listen']['ip'], port=config['listen']['port'], ssl_context=context, threaded=True, debug=config['debug'])
