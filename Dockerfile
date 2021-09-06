FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN npm audit || true
COPY styles.css manifest.json watch/
COPY .* *.* ./
