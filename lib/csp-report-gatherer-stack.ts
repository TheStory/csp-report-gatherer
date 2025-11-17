import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime, Architecture, HttpMethod, FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays, LogGroup } from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

export class CspReportGathererStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Multiple functions (one per website) based on the `sites` context
    const sites = this.node.tryGetContext('sites') as string[] | undefined;
    if (!Array.isArray(sites) || sites.length === 0) {
      throw new Error('Missing websites list: set context "sites" (e.g. -c sites="[\"siteA\",\"siteB\"]") or SITES env var in .env');
    }

    for (const site of sites) {
      const siteId = String(site);
      // Dedicated Log Group with 14-day retention
      const logGroup = new LogGroup(this, `CspReportHandler-${siteId}LogGroup`, {
        retention: RetentionDays.TWO_WEEKS,
      });

      // Lambda that collects CSP reports for a specific website
      const cspHandler = new NodejsFunction(this, `CspReportHandler-${siteId}`, {
        entry: path.join(__dirname, '..', 'src', 'csp-handler.ts'),
        handler: 'handler',
        runtime: Runtime.NODEJS_20_X,
        architecture: Architecture.ARM_64,
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        logGroup,
        environment: {
          SERVICE_NAME: siteId,
        },
      });

      // Function URL with CORS for the given website
      const fnUrl = cspHandler.addFunctionUrl({
        authType: FunctionUrlAuthType.NONE,
        cors: {
          allowedOrigins: ['*'],
          allowedMethods: [HttpMethod.POST],
          // Allow all request headers to accommodate modern browser client hints (sec-ch-*)
          // and any custom headers the browser may include.
          allowedHeaders: ['*'],
          maxAge: cdk.Duration.days(1),
        },
      });

      // Export Function URL per website
      new cdk.CfnOutput(this, `CspReportFunctionUrl-${siteId}`, {
        value: fnUrl.url,
      });
    }
  }
}
