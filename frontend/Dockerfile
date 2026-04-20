FROM node:22-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
# We use npm install instead of npm ci to allow the environment to resolve 
# native binaries that might be missing from a cross-platform lockfile.
RUN npm install
# Explicitly ensure the linux-x64-gnu binaries for lightningcss and tailwindcss/oxide 
# are present as Tailwind CSS 4/Next.js 16 require them for the build process.
RUN npm install lightningcss-linux-x64-gnu @tailwindcss/oxide-linux-x64-gnu

# Rebuild the source code only when needed
FROM base AS builder
# NEXT_PUBLIC_* vars are baked into the bundle at build time, so they must be
# passed as build args (not runtime env vars) when building the Docker image.
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# Depending on Next.js setup, you might need to enable standalone output in next.config.js
# COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# If not using standalone output, copy full node_modules and .next:
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to 0.0.0.0 for accessibility within the container
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
