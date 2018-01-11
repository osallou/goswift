import ssl
import os
import yaml
import logging
import requests
import urllib
from functools import wraps

from flask import Flask
from flask import jsonify
from flask import request
from flask import abort
from flask import Response

from flask_cors import CORS


from goswift import version

config_file = 'config.yml'
if 'GOSWIFT_CONFIG' in os.environ:
  config_file = os.environ['GOSWIFT_CONFIG']

config = None
with open(config_file, 'r') as ymlfile:
    config = yaml.load(ymlfile)

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
CORS(app)


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
    r = requests.get(config['swift']['swift_url'] + '/AUTH_' + str(project) +'?format=json', headers=headers)
    if r.status_code != 200:
        abort(r.status_code)
    return jsonify({'containers:': r.json()})


if __name__ == "__main__":
    context = None
    if config['tls']['cert']:
        context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
        context.load_cert_chain(config['tls']['cert'], config['tls']['key'])
    app.run(host=config['listen']['ip'], port=config['listen']['port'], ssl_context=context, threaded=True, debug=config['debug'])
