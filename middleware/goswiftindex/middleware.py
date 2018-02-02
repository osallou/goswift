from swift.common import wsgi
from swift.common.swob import wsgify
from swift.common.utils import split_path
from swift.common import request_helpers

import requests

class GoSwiftIndexMiddleware(object):
    def __init__(self, app, *args, **kwargs):
        self.app = app
        self.server = kwargs.get('server', None)

    @wsgify
    def __call__(self, request):
        if not self.server:
            return self.app

        try:
            (version, account, container, objname) = split_path(request.path_info, 4, 4, True)
        except ValueError:
            return self.app

        resp = request.get_response(self.app)

        index_path = '/v1/%s/%s/%s' % (account.replace('AUTH_', ''), container, objname)

        headers = {}
        for k, v in request.headers.items():
            if k == 'X-Auth-Token' or k.startswith('X-Object-Meta'):
                headers[k] = v

        if request.method in ['PUT', 'POST', 'DELETE']:
            try:
                if request.method == 'PUT':
                    requests.put(self.server + index_path, headers=headers)
                if request.method == 'POST':
                    requests.put(self.server + index_path, headers=headers)
                if request.method == 'DELETE':
                    requests.put(self.server + index_path, headers=headers)
            except Exception:
                pass

        return resp

def filter_factory(global_config, **local_config):
    server = local_config.get('server')
    def factory(app):
        return GoSwiftIndexMiddleware(app, server=server)
    return factory
