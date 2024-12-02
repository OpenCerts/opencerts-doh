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
    runtime: "nodejs20.x",
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
      target: "node20",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
    },
    customDomain: {
      domainName: "dns.opencerts.io",
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
    associateWaf: {
      name: "${ssm:/${self:custom.project}/${self:provider.stage}/wafv2-name}",
      version: "V2"
    }
  },
};

module.exports = serverlessConfiguration;
