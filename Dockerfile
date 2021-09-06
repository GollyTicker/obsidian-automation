FROM node:16-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
RUN npm audit || true
COPY . .
