FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy backend source
COPY server.js ./
COPY src/ ./src/
COPY .env ./

# Build frontend
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm ci && npm run build

EXPOSE 3001

CMD ["node", "server.js"]
