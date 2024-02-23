# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:latest as base
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production
RUN bun --bun x @puppeteer/browsers install chrome

# run the app
USER bun
CMD [ "bun", "run", "index.ts" ]
