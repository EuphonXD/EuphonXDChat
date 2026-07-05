FROM node:20-alpine

WORKDIR /app

# Copy backend files
COPY package.json package-lock.json* ./
COPY server.js ./
COPY src/ ./src/
COPY server/ ./server/
COPY .env ./

# Install backend dependencies
RUN npm ci

# Copy client and build
COPY client/ ./client/
RUN cd client && npm ci && npm run build

EXPOSE 3001

CMD ["node", "server.js"]
