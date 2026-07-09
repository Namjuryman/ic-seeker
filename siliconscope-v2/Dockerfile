FROM node:22-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY frontend-admin/package.json frontend-admin/package.json

RUN npm ci --workspaces --include=dev

FROM deps AS build

COPY . .

RUN npm run build && npm prune --workspaces --omit=dev

FROM node:22-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8750
ENV PUBLIC_DIR=/app/frontend/dist

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/backend/package.json backend/package.json
COPY --from=build --chown=node:node /app/node_modules node_modules
COPY --from=build --chown=node:node /app/backend/dist backend/dist
COPY --from=build --chown=node:node /app/frontend/dist frontend/dist
COPY --from=build --chown=node:node /app/frontend-admin/dist frontend-admin/dist

USER node

EXPOSE 8750

HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=30s \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8750) + '/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
