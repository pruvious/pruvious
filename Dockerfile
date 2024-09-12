# Use the latest Node.js image as the base
FROM node:current as base
LABEL authors="pruvious"

# Create and set the working directory
RUN mkdir -p /app
WORKDIR /app

# Set the environment to production
ENV NODE_ENV=production

# Build stage
FROM base as build

# Install necessary tools for the build process
RUN apt-get update -y && apt-get install -y openssl git

# Copy package.json and package-lock.json (if available)
COPY --link package.json package-lock.json ./

# Install all dependencies, including devDependencies
# --production=false ensures devDependencies are installed
# --arch=x64 specifies the architecture
RUN npm install --production=false --arch=x64

# Copy the rest of the application code
COPY --link . .

# Build the Nuxt.js application
RUN npm run build

# Production stage
FROM base
WORKDIR /app

# Set the PORT environment variable
ENV PORT=$PORT
ENV NODE_ENV=production

# Copy the built application from the build stage
COPY --from=build /app/.output /app/.output

# Optional: Uncomment if you need unbundled dependencies
# COPY --from=build /src/node_modules /src/node_modules

# Command to run the application
CMD [ "node", ".output/server/index.mjs" ]
