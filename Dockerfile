# Base Node
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# Build de Astro
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Declarar ARGs que se pueden pasar desde docker-compose
ARG DATABASE_URL
ARG JWT_SECRET

# Convertirlos en ENV para que Astro los vea durante el build
ENV DATABASE_URL=$DATABASE_URL
ENV JWT_SECRET=$JWT_SECRET

RUN npm run build

# Producción
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --production

EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
