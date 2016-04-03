# Interactive Data Profiling Dashboard

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
    
    # install server dependencies
    npm install
    
Now change directory to frontend and install its dependencies

    # change dir to frontend
    cd frontend
    
    # install frontend dependencies
    npm install 
    node_modules/bower/bin/bower install

Finally change directory to background profilers directory and install its dependencies

    # change dir to profilers
    cd profilers
    
    # install profilers dependencies
    npm install 

## Configuration

You need to specify the local Mongo connection in `config/connections.js`. Comment the lines mentioning
`productionMongo` object and uncomment those for `localMongo`.

## Running

Launch a new terminal and run

    # start web server
    cd nadeefiler
    npm start

Lanuch another terminal and run

    # start frontend asset server
    cd nadeefiler/frontend
    grunt serve

Launch yet another terminal and run

    # start background worker
    cd nadeefiler/profilers
    npm start
    
No you can point your browser to: [http://127.0.0.1:9000](http://127.0.0.1:9000) to see the running app.
