FROM node:20-alpine AS base
WORKDIR /app
# Variables para que Astro escuche en todas las interfaces dentro del contenedor
ENV HOST=0.0.0.0
ENV PORT=4321

# 2. Deps: Instalamos TODAS las dependencias (necesarias para el build)
FROM base AS deps
COPY package*.json ./
RUN npm ci

# 3. Production Deps: Instalamos SOLO dependencias de producción
# Esto es clave: creamos una carpeta node_modules limpia y ligera para el final
FROM base AS production-deps
COPY package*.json ./
RUN npm ci --only=production

# 4. Builder: Construimos la aplicación
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ARGS y ENVS para el build
# NOTA: Al construir en el servidor, esto es "seguro", pero recuerda que 
# estas variables quedarán grabadas en el historial de la imagen.
ARG DATABASE_URL
ARG JWT_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV JWT_SECRET=$JWT_SECRET

RUN npm run build

# 5. Runner: La imagen final (Pequeña y rápida)
FROM base AS runner

# Copiamos solo los node_modules de producción (Paso 3)
COPY --from=production-deps /app/node_modules ./node_modules

# Copiamos la carpeta dist generada (Paso 4)
COPY --from=builder /app/dist ./dist

# Copiamos package.json por si algún script lo requiere (opcional pero recomendado)
COPY --from=builder /app/package.json ./

# NOTA: He quitado la copia de 'src' y 'drizzle.config.ts'. 
# En producción, node ejecuta el JS compilado en 'dist', no el TS de 'src'.
# Si necesitas correr migraciones al inicio, avísame para ajustar esto.

EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]

