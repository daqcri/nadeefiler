# Interactive Data Profiling Dashboard

## Installation

This is a full-stack Javascript application. You need to install [NodeJS](https://nodejs.org/en/)
and [MongoDB](https://www.mongodb.org/).
If you are using [Homebrew](http://brew.sh/) for Mac:

    brew install node mongodb
    
After NodeJS installation succeeds, change directory to the app root, then install app dependancies using:

    git clone git@github.com:daqcri/nadeefiler.git
    cd nadeefiler
    npm install

## Configuration

You need to specify the local Mongo connection in `config/connections.js`. Comment the lines mentioning
`productionMongo` object and uncomment those for `localMongo`.

## Running

To start the app after successfull installation:

    npm start
    
This will start the app in the default port, point your browser to: http://127.0.0.1:1337
