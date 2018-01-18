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
  export REACT_APP_GOSWIFT_BACKEND_URL="http://localhost:6543" # or whatever url
  yarn build

To launch dev service

.. code-block:: bash

  yarn start

 In production simply server build directory in your web server


Backend
-------

.. code-block:: bash

  pip install -r requirements.txt
  # For dev
  python3 goswift/app.py
  # For prod
  gunicorn goswift.app:app
