FROM node:22-slim

WORKDIR /app

ENV HOST=0.0.0.0
ENV PORT=8750
ENV PUBLIC_DIR=/app/frontend/dist

COPY package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm install --workspaces --include=dev

COPY . .

RUN npm run build && npm prune --workspaces --omit=dev

ENV NODE_ENV=production

EXPOSE 8750

CMD ["npm", "start"]
