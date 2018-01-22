=====
About
=====

Test project for an Openstack swift Web UI

Early development


===========
Development
===========

Config
------

See config.yml.example

Web ui
------

in goswift-ui-web is the Web UI part, using yarn for packages

.. code-block:: bash

  cd goswift/static/goswift-ui/
  yarn install
  # URL to backend server
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

  pip install -r requirements.txt
  # For dev
  python3 goswift/app.py
  # For prod
  gunicorn -b 0.0.0.0 goswift.app:app


======
Docker
======

See docker directory for compose.
