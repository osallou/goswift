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

in goswift/static/goswift-ui is the Web UI part, using yarn for packages

.. code-block:: bash

  cd goswift/static/goswift-ui/
  yarn install
  yarn build

To launch dev service

.. code-block:: bash

  yarn start

Backend
-------

.. code-block:: bash

  pip install -r requirements.txt
  python3 goswift/app.py
