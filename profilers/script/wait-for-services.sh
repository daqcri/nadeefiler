#!/bin/bash
set -e
waitfor=`dirname $0`/wait-for-it.sh

# wait for mongo
$waitfor mongo:27017 -t 60 -s -q

# wait for rabbitmq
$waitfor rabbitmq:5672 -t 60 -s -q

# ready to run requested command
exec "$@"
