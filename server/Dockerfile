# Build from repo root: docker build -f server/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/tsconfig.json ./server/
COPY server/src ./server/src
RUN npm ci -w server
RUN npm run build -w server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci -w server --omit=dev && chown -R node:node /app
COPY --from=build /app/server/dist ./server/dist
USER node
EXPOSE 3001
CMD ["node", "server/dist/index.js"]
