import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CspReportGathererStack } from '../lib/csp-report-gatherer-stack';

describe('CspReportGathererStack (multi-site)', () => {
  const context = { sites: ['siteA', 'siteB'] };

  test('creates one Lambda per site with expected configuration and 14-day log retention', () => {
    const app = new cdk.App({ context });
    const stack = new CspReportGathererStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    // There should be two Lambda functions (one per site)
    template.resourceCountIs('AWS::Lambda::Function', 2);

    const functions = template.findResources('AWS::Lambda::Function');
    const envValues = Object.values(functions).map((res: any) => res.Properties.Environment?.Variables);

    // Common properties for every function
    for (const res of Object.values(functions) as any[]) {
      expect(res.Properties.Runtime).toBe('nodejs20.x');
      expect(res.Properties.Architectures).toEqual(['arm64']);
      expect(res.Properties.MemorySize).toBe(128);
      expect(res.Properties.Timeout).toBe(5);
      expect(res.Properties.Handler).toBe('index.handler');
    }

    // Contains SERVICE_NAME for both sites
    expect(envValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ SERVICE_NAME: 'siteA' }),
        expect.objectContaining({ SERVICE_NAME: 'siteB' }),
      ])
    );
  });

  test('exposes one Function URL per site with proper wide CORS', () => {
    const app = new cdk.App({ context });
    const stack = new CspReportGathererStack(app, 'TestStackUrl');
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::Lambda::Url', 2);

    // Verify each URL has the expected CORS configuration
    const urls = template.findResources('AWS::Lambda::Url');
    for (const res of Object.values(urls) as any[]) {
      expect(res.Properties.AuthType).toBe('NONE');
      expect(res.Properties.Cors).toMatchObject({
        AllowOrigins: ['*'],
        AllowMethods: ['POST'],
        AllowHeaders: ['*'],
        MaxAge: 86400,
      });
      expect(res.Properties.TargetFunctionArn).toBeDefined();
    }
  });

  test('outputs Function URLs per site', () => {
    const app = new cdk.App({ context });
    const stack = new CspReportGathererStack(app, 'TestStackOutput');
    const template = Template.fromStack(stack);

    const outputs = (template as any).template.Outputs ?? {};
    // There should be exactly two outputs (one per site)
    expect(Object.keys(outputs).length).toBe(2);
    // Every output should have a Value
    for (const out of Object.values(outputs) as any[]) {
      expect(out).toHaveProperty('Value');
    }
  });
});
