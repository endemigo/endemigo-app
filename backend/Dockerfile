# Build context = repo kökü (shared-types gerekli):
#   docker build -f backend/Dockerfile -t endemigo-backend .

# --- build aşaması ---
FROM node:22-alpine AS build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY shared-types /app/shared-types
COPY backend .
RUN npm run build

# --- migration aşaması (src + devDeps içerir) ---
# Çalıştırma: docker compose run --rm migrate
FROM build AS migrate
CMD ["npm", "run", "migration:run"]

# --- çalışma aşaması ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/backend/dist ./dist
RUN mkdir -p uploads
EXPOSE 3030
CMD ["node", "dist/main"]
