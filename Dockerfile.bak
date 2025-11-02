# Base Node
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# Copiar código
COPY . .

# Build de Astro
RUN npm run build

# Producción
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/dist ./dist
COPY --from=deps /app/package*.json ./
RUN npm install --production

EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
