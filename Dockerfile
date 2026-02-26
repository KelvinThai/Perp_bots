FROM node:20-alpine AS builder
WORKDIR /build

# Copy and build SDK first (all downstream projects depend on it)
COPY ./protocol-v2/sdk ./protocol-v2/sdk
WORKDIR /build/protocol-v2/sdk
RUN yarn install --ignore-engines && yarn build

# Copy and build Perp_bots
COPY ./Perp_bots ./app
WORKDIR /build/app

# Rewrite SDK dependency to point to the build-context SDK path
RUN node -e "\
    const fs = require('fs'); \
    const pkg = JSON.parse(fs.readFileSync('package.json')); \
    pkg.dependencies['@drift-labs/sdk'] = 'file:../protocol-v2/sdk'; \
    if (pkg.resolutions) pkg.resolutions['@drift-labs/sdk'] = 'file:../protocol-v2/sdk'; \
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));"

RUN yarn install --ignore-engines && yarn build

# Runtime image
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /build/app/dist ./dist
COPY --from=builder /build/app/node_modules ./node_modules
COPY --from=builder /build/app/package.json .

ENTRYPOINT ["node", "dist/index.js"]
