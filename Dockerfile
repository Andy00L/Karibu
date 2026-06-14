# Build and run the Karibu agent (Fastify). Multi-stage: install and build the
# whole pnpm workspace, then run only the agent. Portable host alternative to
# render.yaml (Fly, Railway, a VPS). sourceRef: package.json (pnpm 11.6.0, node
# >=22), apps/agent/package.json (start: node dist/index.js).
# syntax=docker/dockerfile:1
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm install --frozen-lockfile
RUN COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm -r build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV KARIBU_NETWORK=celo
ENV PORT=8787
COPY --from=build /app ./
EXPOSE 8787
# Network, agent id, key, and thirdweb credentials are provided at run time as env
# vars (see .env.example); never bake secrets into the image.
CMD ["node", "apps/agent/dist/index.js"]
