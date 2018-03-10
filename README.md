# nadeefiler

Naddeefiler is an extensible and interactive data profiler.

## Demo
A demo is hosted at http://nadeefiler.da.qcridemos.org/.

## Manual Installation
Manual installation instructions can be found [here](manual-installation.md).
These might be outdated and the Docker installation below is recommended.

## Docker Installation
You need to install [Docker](https://www.docker.com/community-edition)
and [Docker Compose](https://docs.docker.com/compose/install/)
first, then proceed to the following instructions.

### Development

Get the code

    # clone using https
    git clone --recursive https://github.com/daqcri/nadeefiler.git
    # or if you prefer ssh
    git clone git@github.com:daqcri/nadeefiler.git

    cd nadeefiler
    
Build and run:

    docker-compose up --build

Now you can visit [http://localhost:9000](http://localhost:9000).

### Production

TODO