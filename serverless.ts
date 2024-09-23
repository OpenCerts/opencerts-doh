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
    runtime: "nodejs20.x",
    region: "ap-southeast-1",
    stage: "${opt:stage, 'dev'}",
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
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
    infra: {
      deploymentBucket: "${ssm:/trustdocs/${self:provider.stage}/deployment-bucket}"
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
      createRoute53Record: true,
      endpointType: "regional",
      certificateName: "opencerts.io",
    },
    "serverless-offline": {
      port: 3000,
      host: "localhost",
      stage: "dev",
    },
  },
};

module.exports = serverlessConfiguration;
