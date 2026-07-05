FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend and install
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy backend source
COPY server.js ./
COPY src/ ./
COPY .env ./

# Copy client source and build
COPY client/ ./client/
RUN cd client && npm ci && npm run build

FROM node:20-alpine

WORKDIR /app

# Copy everything from builder
COPY --from=builder /app /app

EXPOSE 3001

CMD ["node", "server.js"]
