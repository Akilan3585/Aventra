# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=public.ecr.aws/docker/library/node:22-bookworm-slim

FROM ${NODE_IMAGE} AS base

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

FROM base AS dependencies

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile \
      --fetch-retries=5 \
      --fetch-timeout=120000 \
      --network-concurrency=8

# Local development target. Build with `--target development` to run the
# Next.js development server with hot reload while preserving the production
# Lambda runtime as the Dockerfile's default final target.
FROM base AS development

WORKDIR /app

ENV NODE_ENV=development
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["pnpm", "dev", "--hostname", "0.0.0.0", "--port", "3000"]

FROM base AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are embedded into the browser bundle by `next build`.
# They are identifiers/configuration, never secrets. Supply production values
# with --build-arg; all private keys must be Lambda runtime environment values.
ARG NEXT_PUBLIC_APP_URL=http://localhost:8080
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=${NEXT_PUBLIC_CLERK_SIGN_IN_URL}
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_URL}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}

RUN pnpm build

FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
ENV HOME=/tmp
ENV XDG_CACHE_HOME=/tmp/.cache

# Lambda Web Adapter turns API Gateway/Lambda events into HTTP requests for the
# standard Next.js standalone server. It is ignored during a normal local run.
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.1 \
    /lambda-adapter /opt/extensions/lambda-adapter

ENV AWS_LWA_PORT=8080
ENV AWS_LWA_READINESS_CHECK_PATH=/api/health
ENV AWS_LWA_READINESS_CHECK_PROTOCOL=http
ENV AWS_LWA_ASYNC_INIT=true

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 8080

CMD ["node", "server.js"]
