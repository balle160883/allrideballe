# Etapa de construcción
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Variables de entorno para el build (Dokploy las inyectará)
ARG VITE_MAPBOX_PUBLIC_TOKEN
ARG VITE_API_URL

ENV VITE_MAPBOX_PUBLIC_TOKEN=$VITE_MAPBOX_PUBLIC_TOKEN
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Etapa de servidor web (Nginx)
FROM nginx:stable-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración personalizada de Nginx para manejar rutas de React
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
