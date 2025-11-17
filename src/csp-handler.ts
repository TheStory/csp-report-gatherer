import type { LambdaFunctionURLHandler } from 'aws-lambda';

// Simple console-based logger; will go to the appropriate CloudWatch Log Group
const log = console;

export const handler: LambdaFunctionURLHandler = async (event) => {
  try {
    const method = event.requestContext?.http?.method ?? 'POST';

    // Fast path for CORS preflight
    if (method === 'OPTIONS') {
      return {
        statusCode: 204,
        body: '',
      };
    }

    let body = event.body;
    const isBase64Encoded = Boolean(event.isBase64Encoded);

    if (body && isBase64Encoded) {
      body = Buffer.from(body, 'base64').toString('utf-8');
    }

    if (body) {
      try {
        const report = JSON.parse(body);
        // Extract User-Agent from headers or requestContext (fallback)
        const headers = event.headers ?? {};
        const userAgent =
          headers['user-agent'] ||
          headers['User-Agent'] ||
          event.requestContext?.http?.userAgent ||
          null;
        // Pretty-print CSP report to logs
        log.info(
          `CSP Report received [service=${process.env.SERVICE_NAME}]:\n${JSON.stringify(
            { userAgent, report },
            null,
            2
          )}`
        );
      } catch (e) {
        log.warn('Invalid JSON in CSP report body:', e);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Invalid JSON in report body' }),
        };
      }

      return {
        statusCode: 204,
        body: '',
      };
    } else {
      log.warn('Received request without body');
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'No CSP report body found' }),
      };
    }
  } catch (err) {
    log.error('Error processing CSP report:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
