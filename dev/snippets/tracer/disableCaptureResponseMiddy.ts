import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';

const tracer = new Tracer({ serviceName: 'serverlessAirline' });

const lambdaHandler = async (_event: unknown, _context: unknown): Promise<void> => {
  /* ... */
};

// Wrap the handler with middy
export const handler = middy(lambdaHandler)
// Use the middleware by passing the Tracer instance as a parameter,
// but specify the captureResponse option as false.
  .use(captureLambdaHandler(tracer, { captureResponse: false }));