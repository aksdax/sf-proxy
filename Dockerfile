## Specifies the base image we're extending
FROM node:10

## Create base directory
RUN mkdir /src

## Specify the "working directory" for the rest of the Dockerfile
WORKDIR /src

## Install packages using NPM 5 (bundled with the node:9 image)
COPY ./package.json /src/package.json

RUN npm install --silent

## Add application code
COPY ./lib ./lib

ENV PORT 3123

## Allows port 3005 to be publicly available
EXPOSE 3123


CMD [ "node", "lib/server.js" ]