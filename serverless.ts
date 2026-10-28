import type { AWS } from "@serverless/typescript";

import resolve from "src/functions/resolve";

const serverlessConfiguration: AWS = {
  service: "opencerts-doh",
  frameworkVersion: "3",
  plugins: [
    "serverless-esbuild",
    "serverless-domain-manager",
    "serverless-offline",
  ],
  provider: {
    name: "aws",
    stackName: "opencerts-doh-${self:provider.stage}",
    apiName: "${self:provider.stackName}",
    // DXT-924: Serverless v3 schema/types stop at nodejs20.x, but CloudFormation accepts nodejs22.x
    runtime: "nodejs22.x" as AWS["provider"]["runtime"],
    region: "ap-southeast-1",
    stage: "${opt:stage, 'dev'}",
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    vpc: {
      securityGroupIds: ['${self:custom.infra.securityGroupIds}'],
      subnetIds: "${self:custom.infra.subnetIds}" as unknown as string[]
    },
    logs: {
      restApi: {
        accessLogging: true,
        executionLogging: true,
        format: '{"id":"$context.requestId","extendedId":"$context.extendedRequestId","path":"$context.path","method":"$context.httpMethod","time":"$context.requestTime","source":"$context.identity.sourceIp","resourcePath":"$context.resourcePath","error":{"message":"$context.error.message","type":"$context.error.responseType","validation":"$context.error.validationErrorString"},"waf":{"response":"$context.wafResponseCode","error":"$context.waf.error","status":"$context.waf.status"},"response":{"latency":"$context.responseLatency","length":"$context.responseLength","status":"$context.status"}}',
        level: 'ERROR',
        fullExecutionData: false,
        roleManagedExternally: true,
        role: "${ssm:/${self:custom.project}/${self:provider.stage}/cloudwatch-log-role-arn}"
      }
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
    },
    deploymentBucket: {
      name: "${self:custom.infra.deploymentBucket}"
    },
  },
  functions: {
    resolve,
  },
  package: { individually: true },
  custom: {
    project: "${env:PROJECT_NAME}",
    infra: {
      deploymentBucket: "${ssm:/${self:custom.project}/${self:provider.stage}/deployment-bucket}",
      securityGroupIds: "${ssm:/${self:custom.project}/${self:provider.stage}/security-group-ids}",
      subnetIds: {
        'Fn::Split': [
          ',',
          '${ssm:/${self:custom.project}/${self:provider.stage}/subnet-ids}',
        ],
      },
    },
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ["aws-sdk"],
      target: "node22",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
    },
    domains: {
      prod: "dns.opencerts.io",
      dev: "dns.dev.opencerts.io",
    },
    customDomain: {
      domainName: "${self:custom.domains.${self:provider.stage}}",
      basePath: "",
      stage: "${self:provider.stage}",
      endpointType: "regional",
      securityPolicy: "tls_1_2",
      autoDomain: true,
      createRoute53Record: false
    },
    "serverless-offline": {
      port: 3000,
      host: "localhost",
      stage: "dev",
    },
    // max requests per IP in any 5 minute window before WAF blocks the client
    rateLimitPer5Min: "${env:RATE_LIMIT_PER_5_MIN, 300}",
  },
  resources: {
    Resources: {
      DohWebAcl: {
        Type: "AWS::WAFv2::WebACL",
        Properties: {
          Name: "${self:provider.stackName}-web-acl",
          Scope: "REGIONAL",
          DefaultAction: { Allow: {} },
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: "${self:provider.stackName}-web-acl",
          },
          Rules: [
            {
              Name: "RateLimitPerIp",
              Priority: 0,
              Action: { Block: {} },
              Statement: {
                RateBasedStatement: {
                  Limit: "${self:custom.rateLimitPer5Min}",
                  AggregateKeyType: "IP",
                },
              },
              VisibilityConfig: {
                SampledRequestsEnabled: true,
                CloudWatchMetricsEnabled: true,
                MetricName: "${self:provider.stackName}-rate-limit-per-ip",
              },
            },
          ],
        },
      },
      DohWebAclAssociation: {
        Type: "AWS::WAFv2::WebACLAssociation",
        // the stage only exists once the deployment has been created
        DependsOn: ["ApiGatewayDeployment${sls:instanceId}"],
        Properties: {
          ResourceArn: {
            "Fn::Join": [
              "",
              [
                "arn:aws:apigateway:${self:provider.region}::/restapis/",
                { Ref: "ApiGatewayRestApi" },
                "/stages/${self:provider.stage}",
              ],
            ],
          },
          WebACLArn: { "Fn::GetAtt": ["DohWebAcl", "Arn"] },
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
