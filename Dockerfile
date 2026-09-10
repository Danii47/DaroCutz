FROM node:20-alpine AS base
WORKDIR /app
ENV HOST=0.0.0.0
ENV PORT=4321
ENV TZ=Europe/Madrid

# Dependencias completas (necesarias para el build)
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Solo dependencias de producción, para la imagen final
FROM base AS production-deps
COPY package*.json ./
RUN npm ci --omit=dev

# Build. No recibe secretos: la conexión a la base de datos y el JWT_SECRET
# se leen en tiempo de ejecución, así que no quedan grabados en la imagen.
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Imagen final
FROM base AS runner
ENV NODE_ENV=production

RUN apk add --no-cache tzdata && chown node:node /app

# Se copia como "node": el adaptador de Astro guarda las sesiones dentro de
# node_modules/.astro, así que el usuario sin privilegios necesita poder escribir.
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/scripts ./scripts

USER node

EXPOSE 4321
CMD ["sh", "-c", "node scripts/migrate.mjs && node dist/server/entry.mjs"]
