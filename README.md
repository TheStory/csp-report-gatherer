# CSP Report Gatherer (AWS CDK + Lambda Function URLs)

Collect Content Security Policy (CSP) violation reports via lightweight AWS Lambda functions. This project provisions
one Lambda per website, each exposed with its own Function URL and isolated CloudWatch Logs. CORS is open by default,
and logs are retained for 14 days.

## Features

- Multiple sites in a single stack: one Lambda function per site
- Each function has its own public Function URL
- Base64 decoding support and robust JSON parsing
- Logs include the raw report plus the request's User-Agent
- Separate CloudWatch Log Group per function (14-day retention)
- Wide-open CORS by default: `*` origin, `POST` and `OPTIONS` methods

## Architecture overview

- CDK creates a Lambda per site (provided via `.env`)
- Each Lambda exposes a Function URL with CORS configured
- Handler accepts HTTP API v2-style payloads (Function URL event)
- On success returns `204 No Content`; invalid JSON/body returns `400`

```
Client (browser CSP) -> Function URL (per site) -> Lambda -> CloudWatch Logs
```

## Prerequisites

- Node.js 18+ (Node 20 recommended)
- AWS credentials configured for CDK (profile or environment)

## Getting started

1) Install dependencies

```
npm install
```

2) Configure websites in `.env`

Create a `.env` file in the project root with a comma-separated `SITES` list:

```
SITES=siteA,siteB
```

3) Deploy

```
npx cdk deploy
```

Alternatively, you can pass sites via CDK context instead of `.env`:

```
npx cdk deploy -c sites='["siteA","siteB"]'
```

4) Outputs

Deployment outputs include one Function URL per site, e.g. `CspReportFunctionUrl-siteA`.
Use this URL in your CSP headers (`report-uri` / `report-to`).

## Using the Function URL

Example curl requests:

- Preflight

```
curl -i -X OPTIONS "<FunctionUrl>"
```

- Post a CSP report (JSON)

```
curl -i -X POST "<FunctionUrl>" \
  -H 'Content-Type: application/csp-report' \
  -H 'User-Agent: MyCustomUA/1.0' \
  -d '{"csp-report": {"document-uri": "https://example.com", "violated-directive": "script-src"}}'
```

Expected response: `204 No Content`.

## Configuration details

- CORS: `*` origin, methods `POST`, `OPTIONS`, headers `content-type`, `report-to`, `max-age` 1 day.
- Logs: Each function writes to its own CloudWatch Log Group with 14-day retention.
- Environment variables: Each function receives `SERVICE_NAME` set to the corresponding site ID.

## Development

- Build

```
npm run build
```

- Test

```
npm test
```

- Synthesize (preview CloudFormation)

```
npx cdk synth
```

- Diff

```
npx cdk diff
```

## Handler behavior

- Accepts Function URL events (HTTP API v2 payload shape)
- Decodes body if `isBase64Encoded`
- Parses JSON; logs structured `{ userAgent, report }` and the `SERVICE_NAME`
- Returns:
    - `204` on success (no content)
    - `400` if body is missing or invalid JSON
    - `500` on unexpected errors

## Notes & tips

- If you prefer stricter CORS, set `allowedOrigins` per site in the stack.
- For long-term analytics, consider streaming/logging reports to S3 or a data store.
- Avoid putting secrets in environment variables; use AWS Secrets Manager or SSM Parameter Store.

## License

Apache License 2.0 — see [LICENSE](./LICENSE).

Copyright (c) 2025 Story Design Sp. z o.o. — see [NOTICE](./NOTICE).
