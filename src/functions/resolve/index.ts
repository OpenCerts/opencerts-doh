import { handlerPath } from "@libs/handler-resolver";
import { AWS } from "@serverless/typescript";

const config: AWS["functions"]["Function"] = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: "get",
        path: "resolve",
      },
    },
  ],
};

export default config;
