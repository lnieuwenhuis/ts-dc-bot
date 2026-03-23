FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Declare build arg so Railway passes VITE_API_URL into the docker build
# context — Vite bakes it into the JS bundle at build time, not runtime
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Use nginx templates dir so envsubst replaces ${PORT} at container start
COPY nginx.conf /etc/nginx/templates/default.conf.template
