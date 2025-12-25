FROM node:22-alpine AS builder

WORKDIR /usr/src/backend

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci
COPY . .
RUN npm run build



FROM node:22-alpine AS production

ENV NODE_ENV=production

WORKDIR /usr/src/backend

COPY package*.json ./
COPY --from=builder /usr/src/backend/prisma ./prisma

RUN npm ci --only=production && npm cache clean --force
RUN npx prisma generate

COPY --from=builder /usr/src/backend/dist ./dist

USER node
EXPOSE 3000
#CMD ["node", "dist/main"]
CMD ["/bin/sh", "-c", "cd prisma && npx prisma migrate deploy && node ../dist/main"]