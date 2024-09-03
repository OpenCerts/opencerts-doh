import { handlerPath } from '@libs/handler-resolver';
import { AWS } from "@serverless/typescript";

const config: AWS['functions']['Function'] = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: 'get',
        path: 'resolve',
        cors: {
          origin: 'https://www.opencerts.io',
          headers: ['Accept'],
          allowCredentials: false,
        },
      },
    },
  ],
};

export default config
