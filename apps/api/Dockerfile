FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g turbo

FROM base AS builder
COPY . .
RUN npm ci
RUN turbo run build --filter=@damned/api...

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/db/src ./packages/db/src
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
