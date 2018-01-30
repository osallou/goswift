# Docker for goswift

Application is made of 2 components

REACT_APP_GOSWIFT_BACKEND_URL can be set to the external base url for the backend.
If not set, requests will be sent to the same server than frontend.
In the case, a front web proxy should proxy /api/.. requests to the backend
while leaving other requests to the frontend.

Backend *should* mount ../config.yml to /root/goswift/config.yml in backend
container to override default configuration.
Backend configuration values can however be overriden by settings environement
variables in compose with prefix GOSWIFT_

Sections that can be overriden:

* swift
* salt_secret
* debug

Example:

    GOSWIFT_SWIFT_KEYSTONE_URL=https://.../v3
