#!/bin/bash

if [ -z "$GOSWIFT_WEB_ROOT" ]; then
    echo "GOSWIFT_WEB_ROOT env variable not set"
    exit 1;
fi

cd $GOSWIFT_WEB_ROOT
echo "Build static web site"
echo "REACT_APP_GOSWIFT_BACKEND_URL=$REACT_APP_GOSWIFT_BACKEND_URL"
yarn build
cp -r build/* /usr/share/nginx/html/

echo "Starting nginx"
nginx -g 'daemon off;'
