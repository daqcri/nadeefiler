## Manual installation of platform requirements

This is a full-stack Javascript application. You need to install the following:

- [NodeJS 5.x](https://nodejs.org/en/) for the web server stack
- [MongoDB >= 3.2](https://www.mongodb.org/) as the persistence layer
- [RabbitMQ](https://www.rabbitmq.com/) for message queueing between web servers and background workers

If you are using [Homebrew](http://brew.sh/) for Mac:

    brew install node mongodb rabbitmq

Make sure mongodb and rabbitmq services are up an running

    brew services list

You should see the following

    ...
    mongodb    started ...
    rabbitmq   started ...
    ...

If any of the services are not started, start them using

    brew services start mongodb
    brew services start rabbitmq

## Installation of project with dependencies

    # install dependencies
    npm install
    
    # install profilers dependencies
    (cd profilers && npm install)

    # install frontend dependencies
    (cd frontend && npm install && node_modules/bower/bin/bower install && grunt build)

## Installation of support data
There is one type of profilers that uses 
[YAGO](http://www.mpi-inf.mpg.de/departments/databases-and-information-systems/research/yago-naga/yago/downloads/)
knowledge-base to infer semantic types of data.
For this to work, you must import a processed yagoSimpleTypes.tsv into the mongodb which can be
downloaded from [here](http://qcridatasets.s3-website-us-west-1.amazonaws.com/yagoSimpleTypes-nadeefiler.tsv.gz).

    # download the tsv
    curl -o yagoSimpleTypes-nadeefiler.tsv.gz http://qcridatasets.s3-website-us-west-1.amazonaws.com/yagoSimpleTypes-nadeefiler.tsv.gz
    # decompress
    gunzip yagoSimpleTypes-nadeefiler.tsv.gz
    # import (honors MONGOLAB_URI environment variable, defaults to localhost/nadeefiler_dev)
    ./import-yago.js < yagoSimpleTypes-nadeefiler.tsv
    # create the text index from mongo shell
    # 1. Using MONGOLAB_URI if set:
    mongo $MONGOLAB_URI
    # 2. Or using localhost/nadeefiler_dev (development only):
    mongo nadeefiler_dev
    # from the shell prompt:
    db.yagoSimpleTypes.createIndex({subject: 'text'})

## Running

[Optional] If you are running in production, rather than a local development machine:

    export NODE_ENV=production

Launch a new terminal and run

    npm start  # starting a web server

Launch yet another terminal and run

    npm run profilers  # starting a background worker
    
No you can point your browser to: [http://127.0.0.1:1337](http://127.0.0.1:1337) to see the running app.

In production, you typically run multiple of these web servers on different machines as up-streams and put
a load-balancer (e.g. nginx) to receive traffic on port 80 and direct traffic to the up-streams.
Environment variables should be set for these web servers to access mongodb and rabbitmq. Namely, these
are `MONGOLAB_URI` and `CLOUDAMQP_URL`, respectively.
For background workers, you can run multiple of them to increase the job processing rate. You run the workers
on different machines or cores, provided that they can access the same environment variables like the web servers.

## Development
These are some notes to keep in mind while developing on your local machine:

- `frontend` directory hosts the static angular app. If you run a `grunt serve` inside it, it will watch for changes
to any files and reload the `livereload` server with your changes. Alternatively, you can just run `npm run livereload`
in the app root folder. The `livereload` server runs on a port 9000 by default, so you would rather
point your browser to [http://127.0.0.1:9000](http://127.0.0.1:9000).
- Whenever you change the backend `sails` app, you need to restart the `sails` web server.
- Both `frontend` and `profilers` are npm packages that have their own dependencies and essentially `package.json`.
Moreover, `frontend` has its own `bower` dependencies. Use `npm install --save` and `bower install --save` to add
new dependencies and commit your changes to `package.json` and `bower.json`.
