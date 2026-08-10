# Dockerfile para Frontend (Next.js) - Multi-stage Build
# Usa un proxy interno (Next.js rewrites) para evitar Mixed Content (HTTPS → HTTP)

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
# BACKEND_URL: URL interna del backend en la red Docker.
# El Next.js server usa esta URL para re-dirigir /api-backend/* al backend.
# NO es una variable pública del browser; el browser solo usa paths relativos (/api-backend).
ARG BACKEND_URL=http://backend:4000
ENV BACKEND_URL=$BACKEND_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Pasar BACKEND_URL al servidor de producción
ARG BACKEND_URL=http://backend:4000
ENV BACKEND_URL=$BACKEND_URL

# Standalone output copying
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
