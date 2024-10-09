import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import middy from "@middy/core";
import { queryDns, googleDnsResolver, cloudflareDnsResolver } from "@govtechsg/dnsprove";
import { formatJSONResponse } from "@libs/api-gateway";
import { errorResponse, SchemaValidationError, validateSchema } from "@functions/resolve/helpers";
import { dnsResultSchema, queryParamSchema } from "@functions/resolve/schemas";
import { cors } from "@functions/resolve/cors";

const resolve: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    validateSchema(event.queryStringParameters, queryParamSchema);
  } catch (e: unknown) {
    return formatJSONResponse(
      errorResponse("Invalid parameters", (e as SchemaValidationError).errors),
      400,
    );
  }

  const domain = event.queryStringParameters?.name;
  try {
    const res = (await queryDns(domain, [
      googleDnsResolver,
      cloudflareDnsResolver,
    ])) as unknown as Record<string, unknown>;
    validateSchema(res, dnsResultSchema);
    return formatJSONResponse(res);
  } catch (e) {
    return formatJSONResponse(errorResponse(e.message), 502);
  }
};

export const main = middy(resolve).use(cors);
