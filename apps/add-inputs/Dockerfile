# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:latest as base
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production
RUN bun run install:chrome

# run the app
USER bun
CMD [ "bun", "run", "index.ts" ]
