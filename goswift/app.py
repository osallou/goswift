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

import humanfriendly

from flask import Flask
from flask import jsonify
from flask import request
from flask import abort
from flask import Response

from flask_cors import CORS, cross_origin


from goswift import version

config_file = 'config.yml'
if 'GOSWIFT_CONFIG' in os.environ:
  config_file = os.environ['GOSWIFT_CONFIG']

config = None
with open(config_file, 'r') as ymlfile:
    config = yaml.load(ymlfile)

def override_config():
    if 'GOSWIFT_DEBUG' in os.environ:
        config['debug'] = os.environ['GOSWIFT_DEBUG']
    if 'GOSWIFT_SALT_SECRET' in os.environ:
        config['salt_secret'] = os.environ['GOSWIFT_SALT_SECRET']
    if 'GOSWIFT_SWIFT_KEYSTONE_URL' in os.environ:
        config['swift']['keystone_url'] = os.environ['GOSWIFT_SWIFT_KEYSTONE_URL']
    if 'GOSWIFT_SWIFT_SWIFT_URL' in os.environ:
        config['swift']['swift_url'] = os.environ['GOSWIFT_SWIFT_SWIFT_URL']

    if 'GOSWIFT_SWIFT_ADMIN_OS_USER_ID' in os.environ:
        config['swift']['admin']['os_user_id'] = os.environ['GOSWIFT_SWIFT_ADMIN_OS_USER_ID']
    if 'GOSWIFT_SWIFT_ADMIN_OS_USER_PASSWORD' in os.environ:
        config['swift']['admin']['os_user_password'] = os.environ['GOSWIFT_SWIFT_ADMIN_OS_USER_PASSWORD']
    if 'GOSWIFT_SWIFT_ADMIN_OS_USER_PROJECT' in os.environ:
        config['swift']['admin']['os_user_project'] = os.environ['GOSWIFT_SWIFT_ADMIN_OS_USER_PROJECT']
    if 'GOSWIFT_SWIFT_ADMIN_OS_USER_DOMAIN' in os.environ:
        config['swift']['admin']['os_user_domain'] = os.environ['GOSWIFT_SWIFT_ADMIN_OS_USER_DOMAIN']

    if 'GOSWIFT_SWIFT_DEFAULTS_DOMAIN' in os.environ:
        config['swift']['defaults']['domain'] = os.environ['GOSWIFT_SWIFT_DEFAULTS_DOMAIN']

    if 'GOSWIFT_SWIFT_QUOTAS' in os.environ:
        config['swift']['quotas'] = os.environ['GOSWIFT_SWIFT_QUOTAS']

override_config()

if config['debug']:
    logging.basicConfig(level=logging.DEBUG)

MIME_TYPE_JSON = 'application/json'
MIME_TYPE_JSON_HOME = 'application/json-home'
MEDIA_TYPE_JSON = 'application/vnd.openstack.key-manager-%s+json'

def _get_base_url_from_request():
    if not config['host_href'] and hasattr(request, 'url'):
        p_url = urllib.parse.urlsplit(request.url)
        if p_url.path:
            base_url = '%s://%s%s' % (p_url.scheme, p_url.netloc, p_url.path)
        else:
            base_url = '%s://%s' % (p_url.scheme, p_url.netloc)
        return base_url
    else:
        return config['host_href']

def _get_versioned_url(version):
    if version[-1] != '/':
        version += '/'
    # If host_href is not set in osvmexpire conf,
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
                    'href': 'https://github.com/genouest/goswift'
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

@app.route('/api/<apiversion>/auth', methods=['POST'])
def authenticate(apiversion):
    data =  request.get_json()
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
            logging.info('Authentication failed: %s' + str(data['user']))
            abort(401)
        token = r.headers['X-Subject-Token']
        r_json = r.json()
        project_id = r_json['token']['project']['id']

    except Exception as e:
        logging.exception('Failed to authenticate with Keystone')
        abort(401)

    return jsonify({'token': token, 'project': project_id})

@app.route('/api/<apiversion>/project/<project>', methods=['GET'])
@requires_auth
def get_project_containers(apiversion, project):
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
    }
    r = requests.get(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) +'?format=json', headers=headers)
    if r.status_code not in [200]:
        abort(r.status_code)
    return jsonify({'containers': r.json()})


@app.route('/api/<apiversion>/project/<project>/<container>', methods=['POST'])
@requires_auth
def create_project_containers(apiversion, project, container):
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
    }
    r = requests.put(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container +'?format=json', headers=headers)
    if r.status_code not in [201, 202]:
        abort(r.status_code)
    return jsonify({'msg': 'container created'})


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
    duration_in_seconds = 3600 * 24 * 30 # 30 days
    expires = int(time() + duration_in_seconds)
    path = '/v1/AUTH_' + project + '/' + container + '/' + str(filepath)
    key = crypt.crypt(project,'$6$' + config['salt_secret']).encode('utf-8')
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
        'X-Account-Meta-Temp-URL-Key': key,
    }
    r = requests.post(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) , headers=headers)
    if not r.status_code == 204:
        abort(500)
    hmac_body = '%s\n%s\n%s' % (method, expires, path)
    sig = hmac.new(key, hmac_body.encode('utf-8'), sha1).hexdigest()
    s = '{host}/{path}?temp_url_sig={sig}&temp_url_expires={expires}'
    tmpurl = s.format(host=config['swift']['swift_url'], path=path, sig=sig, expires=expires)
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
            if r.status_code != 200:
                logging.error('Quota error for ' + str(project) + ':' + r.text)
                #abort(r.status_code)

    # Set CORS for container
    headers = {
        'X-Auth-Token': request.headers['X-Auth-Token'],
        'X-Container-Meta-Access-Control-Allow-Origin': '*',
    }
    r = requests.post(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container , headers=headers)
    if r.status_code != 204:
        abort(r.status_code)

    # Get container info
    r = requests.get(config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container+'?format=json&path=&delimiter=/&prefix=' , headers=headers)
    if r.status_code != 200:
        abort(r.status_code)
    return jsonify({'container': r.json(), 'url': config['swift']['swift_url'] + '/v1/AUTH_' + str(project) + '/' + container})


if __name__ == "__main__":
    context = None
    if config['tls']['cert']:
        context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
        context.load_cert_chain(config['tls']['cert'], config['tls']['key'])
    app.run(host=config['listen']['ip'], port=config['listen']['port'], ssl_context=context, threaded=True, debug=config['debug'])
