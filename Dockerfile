FROM node:20-alpine

WORKDIR /app

# Copy all source files
COPY package.json package-lock.json* ./
COPY server.js ./
COPY src/ ./src/
COPY .env ./
COPY client/ ./

# Install all dependencies and build frontend
RUN npm ci && cd client && npm ci && npm run build

EXPOSE 3001

CMD ["node", "server.js"]
