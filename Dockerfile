FROM node:20-alpine

# Install system dependencies for native modules
RUN apk add --no-cache python3 make g++ ffmpeg git

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clear npm cache and install dependencies
RUN npm cache clean --force
RUN npm install --verbose

# Copy source code
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]