=====
About
=====

Openstack swift Web UI

========
Features
========

* File upload (<5g else use swift client) /download
* File/directory browsing
* File metadata edition
* Projet quota management
* Set bucket as public/private
* Web hooks to trigger external services on file upload/modifications
* Temporary urls management to share a file with external users/apps
* Content indexation and search (based on file names, not content)
* Authentication via keystone

============
Installation
============

Config
------

See config.yml.example

Web ui
------

in goswift-ui-web is the Web UI part, using yarn for packages

.. code-block:: bash

  cd ggoswift-ui-web
  yarn install
  # URL to backend server
  export REACT_APP_GOSWIFT_SWITF_URL="http://swift_url"
  export REACT_APP_GOSWIFT_BACKEND_URL="http://localhost:6543" # or whatever url, if proxying /api to backend, leave empty
  yarn build

Best is to set a proxy that proxies /api requests on frontend to backend, and setting REACT_APP_GOSWIFT_BACKEND_URL to empty.
This is what docker service does.

To launch dev service

.. code-block:: bash

  yarn start


In production simply serve build directory in your web server


Backend
-------

.. code-block:: bash

  pip3 install -r requirements.txt

  # For dev
  python3 setup.py develop
  python3 goswift/app.py
  # For prod
  python3 setup.py install
  gunicorn -b 0.0.0.0 goswift.app:app

========
Indexing
========

Swift does not propose search operations. Goswift can be used to index objects
path and metadata to allow later queries.
To do so, *middleware* (middleware/ directory) must be installed on proxy-server
swift location and added to the pipeline.
On POST/PUT/DELETE object operations, a request is sent to goswift and data
is (de)indexed.

Example, in proxy-server.conf:

    pipeline = .... goswiftindex ... proxy-server

    [filter:goswiftindex]
    use = egg:goswiftindex#middleware
    server = http://1.2.3.4.5:6543

Goswift makes use of elasticsearch. Docker compose installs a single node
elasticsearch server, but it may not fit in production for large systems.
You should in this case specify your own elasticsearch servers in goswift config.


======
Docker
======

See docker directory for compose.
