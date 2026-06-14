# Dockerfile para Frontend (Next.js) - Multi-stage Build
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
# Si Dokploy no pasa el ARG, usa la URL del servidor de producción por defecto
ARG NEXT_PUBLIC_API_URL=http://2.24.81.205:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Mantener la URL en la imagen de ejecución (para SSR/proxy rewrites)
ARG NEXT_PUBLIC_API_URL=http://2.24.81.205:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Standalone output copying
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]

