FROM node:6

ARG node_env=production

ENV NODE_ENV $node_env

WORKDIR /home

# cache node_modules using docker layers
# any change to package.json will rebuild modules
ADD package.json /home/
RUN npm install

ADD / /home/

CMD ["npm", "start"]
