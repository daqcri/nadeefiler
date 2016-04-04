# Interactive Data Profiling Dashboard

## Demo
A demo is hosted at http://nadeefiler.da.qcridemos.org/.

## Installation of platform requirements

This is a full-stack Javascript application. You need to install the following:

- [NodeJS 5.x](https://nodejs.org/en/) for the web server stack
- [MongoDB >= 2.2](https://www.mongodb.org/) as the persistence layer
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

## Installation of project dependencies

Clone project, change directory to its root, then install dependencies of web server

    # clone
    git clone git@github.com:daqcri/nadeefiler.git

    # change dir
    cd nadeefiler
    
    # install dependencies
    npm install
    
That's it. The previous `npm install` command will trigger the `postinstall` script that will install
dependencies of `frontend` and `profilers` sub-directories.
    
## Running

Launch a new terminal and run

    # start (sails) web server
    cd nadeefiler
    npm start

Launch yet another terminal and run

    # start background worker
    cd nadeefiler/profilers
    npm start
    
No you can point your browser to: [http://127.0.0.1:9000](http://127.0.0.1:9000) to see the running app.

## Development
These are some notes to keep in mind while developing on your local machine:

- `frontend` directory hosts the static angular app. If you run a `grunt serve` inside it, it will watch for changes
to any files and reload the `livereload` server with your changes. The `livereload` server runs on a separate port.
- Whenever you change the backend `sails` app, you need to restart the `sails` web server.
- Both `frontend` and `profilers` are npm packages that have their own dependencies and essentially `package.json`.
Moreover, `frontend` has its own `bower` dependencies. Use `npm install --save` and `bower install --save` to add
new dependencies and commit your changes to `package.json` and `bower.json`.
