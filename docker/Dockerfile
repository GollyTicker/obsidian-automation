# Installs the NPM dependencies for the execution inside docker container

FROM node:16

WORKDIR /app

COPY *.json *.js ./

RUN npm ci

RUN npm audit || true
