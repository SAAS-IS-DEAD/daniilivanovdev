# syntax=docker/dockerfile:1
FROM node:24.22.2-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --global npm@11.21.1
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --no-audit --no-fund
FROM dependencies AS build
COPY . .
RUN npm run build

FROM build AS setup
USER node
CMD ["npm", "run", "setup", "--workspace", "apps/api"]

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev --no-audit --no-fund
RUN node --input-type=module -e "import {hash,verify,argon2id} from 'argon2'; if (!await verify(await hash('build-check', {type:argon2id}), 'build-check')) process.exit(1)"

FROM node:24.22.2-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
