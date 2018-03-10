FROM node:6

ARG node_env=production

ENV NODE_ENV $node_env

WORKDIR /home

# cache node_modules using docker layers
# any change to package.json will rebuild modules
ADD package.json /home/package.json
RUN npm install
ADD bower.json /home/bower.json
RUN node_modules/bower/bin/bower --allow-root install

ADD / /home/
RUN node_modules/grunt-cli/bin/grunt build

EXPOSE 9000

CMD ["npm", "start"]
