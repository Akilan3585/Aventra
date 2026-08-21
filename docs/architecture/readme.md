`# Next.js Docker Deployment with AWS Lambda Web Adapter

## Overview

This project uses a **multi-stage Docker build** to package a Next.js application for both local development and production deployment on **AWS Lambda**.

The production image uses the **AWS Lambda Web Adapter**, which allows a standard Next.js standalone server to run inside AWS Lambda without rewriting the application as native Lambda handlers.

The Dockerfile also includes a separate development target for running the application locally with hot reload.

## Architecture

The deployment flow is:

```text
Next.js Application
        ↓
pnpm build
        ↓
Next.js Standalone Output
        ↓
Docker Image
        ↓
Amazon ECR
        ↓
AWS Lambda
        ↓
Lambda Web Adapter
        ↓
API Gateway / Lambda Function URL
        ↓
Users
```

## Dockerfile Stages

### Base Stage

The base image uses:

```text
Node.js 22 Bookworm Slim
```

It configures:

* pnpm using Corepack
* `PNPM_HOME`
* Next.js telemetry disabled

The configured pnpm version is:

```text
pnpm 11.9.0
```

### Dependencies Stage

This stage installs all application dependencies using the lock file.

```bash
pnpm install --frozen-lockfile
```

A Docker BuildKit cache is used for the pnpm store to improve subsequent build performance.

### Development Stage

The development target is intended for local development.

It:

* Sets `NODE_ENV=development`
* Runs the Next.js development server
* Exposes port `3000`
* Supports hot reload

Build it using:

```bash
docker build --target development -t pxllaw-dev .
```

Run it using:

```bash
docker run -p 3000:3000 pxllaw-dev
```

The application will be available at:

```text
http://localhost:3000
```

## Builder Stage

The builder stage creates the production Next.js application.

The important command is:

```bash
pnpm build
```

Next.js generates the optimized production files during this stage.

The project should use standalone output in `next.config.ts` or `next.config.js`.

Example:

```ts
const nextConfig = {
  output: "standalone",
};

export default nextConfig;
```

This generates:

```text
.next/standalone
```

which is copied into the final production Docker image.

## Public Environment Variables

`NEXT_PUBLIC_*` environment variables are embedded into the frontend bundle during `next build`.

Examples used by this project include:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Production values can be supplied using Docker build arguments.

Example:

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://example.com \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxxxx \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxxxx \
  -t pxllaw .
```

## Secrets

Private credentials must **not** be passed through Docker build arguments or committed into the Dockerfile.

Examples include:

```text
CLERK_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
OPENAI_API_KEY
GEMINI_API_KEY
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

For production, sensitive values should be stored using:

* AWS Secrets Manager
* AWS Systems Manager Parameter Store
* Lambda environment variables where appropriate

The Lambda execution role should provide AWS permissions instead of storing AWS access keys inside the application.

## Production Runtime

The final image runs the Next.js standalone server using:

```bash
node server.js
```

The application listens on:

```text
0.0.0.0:8080
```

The runtime image only contains the files required for production:

```text
public/
.next/static/
Next.js standalone server
AWS Lambda Web Adapter
```

This keeps the final container smaller than copying the entire source repository.

## AWS Lambda Web Adapter

The AWS Lambda Web Adapter is copied into:

```text
/opt/extensions/lambda-adapter
```

It converts Lambda events into normal HTTP requests that the Next.js server can process.

The application itself therefore continues to behave like a normal HTTP server.

Configured options include:

```text
AWS_LWA_PORT=8080
AWS_LWA_READINESS_CHECK_PATH=/api/health
AWS_LWA_READINESS_CHECK_PROTOCOL=http
AWS_LWA_ASYNC_INIT=true
```

## Health Check Endpoint

The application should expose:

```text
/api/health
```

Example Next.js App Router implementation:

```ts
export async function GET() {
  return Response.json({
    status: "healthy",
  });
}
```

The health endpoint should:

* Return HTTP `200`
* Avoid authentication
* Avoid expensive database operations
* Respond quickly

The Lambda Web Adapter uses this endpoint to determine when the Next.js server is ready.

## Local Production Build

Before building the Docker image, verify that the Next.js production build works locally.

Run:

```bash
pnpm install --frozen-lockfile
pnpm build
```

If `pnpm build` fails locally, Docker will also fail at:

```dockerfile
RUN pnpm build
```

Fix all Next.js compilation errors before continuing with the Docker deployment.

## Common Build Errors

### TypeScript Compilation Error

Example:

```text
Type error
Failed to compile
```

Run:

```bash
pnpm build
```

and fix the first reported TypeScript error.

### Missing Module

Example:

```text
Module not found
```

Install the required package:

```bash
pnpm add <package-name>
```

### Missing Environment Variables

If application code validates environment variables during the build, required `NEXT_PUBLIC_*` variables must be supplied before running `next build`.

### Standalone Directory Missing

If Docker reports that:

```text
.next/standalone
```

does not exist, verify that Next.js contains:

```ts
output: "standalone"
```

in the Next.js configuration.

### Sharp Missing

For production Next.js image optimization, install Sharp when required:

```bash
pnpm add sharp
```

## Building the Production Docker Image

Build using:

```bash
docker build -t pxllaw .
```

With production public variables:

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://example.com \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxxxx \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxxxx \
  -t pxllaw .
```

## Running the Production Image Locally

Run:

```bash
docker run --rm -p 8080:8080 pxllaw
```

If runtime environment variables are required:

```bash
docker run --rm \
  -p 8080:8080 \
  --env-file .env.local \
  pxllaw
```

Open:

```text
http://localhost:8080
```

Test the health endpoint:

```text
http://localhost:8080/api/health
```

## Production Deployment Flow

The recommended deployment sequence is:

```text
1. Develop and test application
        ↓
2. Run pnpm build
        ↓
3. Build Docker image
        ↓
4. Run container locally
        ↓
5. Test /api/health
        ↓
6. Push Docker image to Amazon ECR
        ↓
7. Create/update AWS Lambda
        ↓
8. Configure Lambda IAM role
        ↓
9. Configure Secrets Manager/environment variables
        ↓
10. Expose Lambda through API Gateway or Function URL
        ↓
11. Configure monitoring and logging
```

## Recommended AWS Services

For a production deployment, the application can integrate with:

| Requirement            | AWS Service                       |
| ---------------------- | --------------------------------- |
| Container Registry     | Amazon ECR                        |
| Compute                | AWS Lambda                        |
| Public HTTP Endpoint   | API Gateway / Lambda Function URL |
| Secrets                | AWS Secrets Manager               |
| Logs                   | Amazon CloudWatch Logs            |
| Metrics                | Amazon CloudWatch                 |
| Security Permissions   | AWS IAM                           |
| DNS                    | Amazon Route 53                   |
| CDN                    | Amazon CloudFront                 |
| Application Protection | AWS WAF                           |

## Security Recommendations

For production:

* Never store AWS access keys inside Docker images.
* Use IAM roles for Lambda.
* Store application secrets in Secrets Manager.
* Keep `NEXT_PUBLIC_*` variables limited to values safe for browser exposure.
* Scan container images before deployment.
* Use minimal IAM permissions.
* Enable CloudWatch logging.
* Enable AWS WAF when the application is exposed publicly.
* Keep Node.js and dependencies updated.
* Never commit `.env` files containing secrets.

## Troubleshooting Build Failures

If Docker fails with:

```text
process "/bin/sh -c pnpm build" did not complete successfully
```

the Docker engine is usually **not the actual problem**.

Run:

```bash
pnpm build
```

outside Docker first.

Look for the first error related to:

```text
Type error
Module not found
Failed to compile
Prerendering error
Environment variable missing
ReferenceError
```

Fix that application error and rebuild the image.

## Summary

This Docker setup provides:

* Reproducible pnpm dependency installation
* Local Next.js development environment
* Multi-stage Docker builds
* Smaller production image
* Next.js standalone deployment
* Node.js 22 runtime
* AWS Lambda compatibility
* AWS Lambda Web Adapter integration
* Health-check support
* Separation of public build configuration and runtime secrets

The most important validation before AWS deployment is:

```bash
pnpm build
```

followed by:

```bash
docker build -t pxllaw .
```

and:

```bash
docker run -p 8080:8080 pxllaw
```

Only after these steps work successfully should the container be pushed to Amazon ECR and deployed to AWS Lambda.
