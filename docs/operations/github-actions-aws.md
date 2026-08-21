# GitHub Actions deployment to AWS Lambda

The repository has two workflows:

- `CI` runs linting, type-checking, tests, and a production Next.js build. Pull
  requests also build the production Docker target.
- `Deploy AWS Lambda` runs only after a successful `CI` push to `main`, or from
  an explicit manual dispatch from `main`. It builds an ARM64 image using
  Docker's single-image exporter, pushes it to ECR by an immutable run tag,
  validates that ECR returned a Docker V2 or OCI image manifest rather than a
  multi-architecture index, verifies the config and every layer media type,
  deploys that ECR digest, publishes a Lambda version, and advances the
  production alias.

The deployment stops before updating Lambda unless ECR reports one of each
supported type:

| Image object | Accepted media types |
| --- | --- |
| Manifest | `application/vnd.docker.distribution.manifest.v2+json`, `application/vnd.oci.image.manifest.v1+json` |
| Config | `application/vnd.docker.container.image.v1+json`, `application/vnd.oci.image.config.v1+json` |
| Layer | `application/vnd.docker.image.rootfs.diff.tar.gzip`, `application/vnd.oci.image.layer.v1.tar+gzip` |

Production deployments use GitHub OIDC. Do not create `AWS_ACCESS_KEY_ID` or
`AWS_SECRET_ACCESS_KEY` repository secrets.

## Required GitHub environment

Create a GitHub environment named `production`. Add approval protection before
using the workflow for a live campus. Configure these environment variables:

| Variable | Example | Purpose |
| --- | --- | --- |
| `AWS_ACCOUNT_ID` | `123456789012` | Reject credentials from an unexpected account |
| `AWS_REGION` | `ap-south-1` | ECR and Lambda region |
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::123456789012:role/aventra-github-deploy` | OIDC deployment role |
| `AWS_ECR_REPOSITORY` | `aventra-ai` | Existing private ECR repository name |
| `AWS_LAMBDA_FUNCTION_NAME` | `aventra-ai-production` | Existing image-based Lambda function |
| `AWS_LAMBDA_ALIAS` | `production` | Stable API Gateway alias; defaults to `production` |
| `AWS_SMOKE_TEST_URL` | `https://campus.example.edu` | Optional public URL tested after alias promotion |
| `NEXT_PUBLIC_APP_URL` | `https://campus.example.edu` | Browser application URL embedded at build time |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Browser-visible Clerk key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Optional Clerk sign-in path |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Optional Clerk sign-up path |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://project.supabase.co` | Browser-visible Supabase URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Browser-visible Supabase key |

Clerk secret keys, Supabase secret keys, AI keys, and webhook signing secrets
remain Lambda runtime settings backed by AWS Secrets Manager. They must never be
GitHub build arguments.

## AWS OIDC trust

Create the GitHub OIDC provider for `https://token.actions.githubusercontent.com`
with audience `sts.amazonaws.com`. The deployment role trust policy should be
restricted to this repository and the protected production environment:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:Akilan3585/AventraAI:environment:production"
        }
      }
    }
  ]
}
```

## Minimum deployment permissions

Replace the account, region, repository, and function placeholders before
attaching this policy to the OIDC role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CompleteLayerUpload",
        "ecr:GetDownloadUrlForLayer",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": "arn:aws:ecr:REGION:ACCOUNT_ID:repository/REPOSITORY_NAME"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:CreateAlias",
        "lambda:GetAlias",
        "lambda:GetFunction",
        "lambda:GetFunctionConfiguration",
        "lambda:PublishVersion",
        "lambda:UpdateAlias",
        "lambda:UpdateFunctionCode"
      ],
      "Resource": [
        "arn:aws:lambda:REGION:ACCOUNT_ID:function:FUNCTION_NAME",
        "arn:aws:lambda:REGION:ACCOUNT_ID:function:FUNCTION_NAME:*"
      ]
    }
  ]
}
```

Configure the Lambda function for `arm64`, package type `Image`, port `8080`
through AWS Lambda Web Adapter, and API Gateway integration against the stable
alias. The workflow intentionally does not create or modify networking, IAM,
runtime secrets, ECR policies, API Gateway, or database migrations.

Protect `main` and require the `Quality and production build` and
`Validate Lambda container` checks before merge. Configure production
environment reviewers so alias promotion requires an explicit approval.
