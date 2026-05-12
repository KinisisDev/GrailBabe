FROM node:20-alpine AS builder
RUN npm install -g pnpm@9
WORKDIR /app
COPY package.json pnpm-lock.yaml* .npmrc* pnpm-workspace.yaml* ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
RUN pnpm install --no-frozen-lockfile
WORKDIR /app/artifacts/api-server
RUN node ./build.mjs

FROM node:20-alpine
ENV NODE_ENV=production
ENV PORT=80
WORKDIR /app
COPY --from=builder /app/artifacts/api-server/dist ./dist
EXPOSE 80
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
