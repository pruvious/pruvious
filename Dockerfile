FROM node:current as base
LABEL authors="pruvious"

# Create destination directory
RUN mkdir -p /app
WORKDIR /app

ENV NODE_ENV=production

# Build - Build nuxt app
FROM base as build

RUN apt-get update -y && apt-get install -y openssl git

COPY --link package.json package-lock.json ./

RUN npm install --production=false --arch=x64

COPY --link . .

# Build nuxt
RUN npm run build

# Run - This is the final stage that get's deployed
FROM base
WORKDIR /app

ENV PORT=$PORT
ENV NODE_ENV=production

COPY --from=build /app/.output /app/.output

# Optional, only needed if you rely on unbundled dependencies
# COPY --from=build /src/node_modules /src/node_modules

CMD [ "node", ".output/server/index.mjs" ]
