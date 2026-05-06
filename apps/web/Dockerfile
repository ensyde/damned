FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g turbo

FROM base AS builder
COPY . .
RUN npm ci
RUN turbo run build --filter=@damned/web...

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT 3000
CMD ["node", "apps/web/server.js"]
