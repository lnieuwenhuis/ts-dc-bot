FROM node:20-alpine

RUN apk add --no-cache python3 make g++ ffmpeg git

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY src/ ./src/
COPY tsconfig.json ./
COPY tsup.config.ts ./

RUN addgroup -g 1001 -S nodejs
RUN adduser -S botuser -u 1001
RUN chown -R botuser:nodejs /app
USER botuser

EXPOSE 3000

CMD ["npx", "tsx", "src/main.ts"]
