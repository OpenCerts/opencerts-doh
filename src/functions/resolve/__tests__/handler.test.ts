import { queryDns } from "@govtechsg/dnsprove";
import type { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { main as handler } from "../handler";

jest.mock("@govtechsg/dnsprove");

describe("resolve handler test", () => {
  const createMockEvent = (
    queryStringParameters: Record<string, string> | null,
  ): APIGatewayProxyEventV2 =>
    ({
      version: "2.0",
      queryStringParameters: queryStringParameters,
      requestContext: {
        http: {
          method: "GET",
        },
      },
    }) as APIGatewayProxyEventV2;

  const mockContext = {
    callbackWaitsForEmptyEventLoop: false,
  } as Context;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should return 200 status code when querying a valid domain", async () => {
    const mockEvent = createMockEvent({ name: "opencerts.io" });
    const mockQueryDnsResult = {
      Status: 0,
      AD: true,
      Answer: [
        {
          name: "opencerts.io",
          data: "openatts net=ethereum netId=3 addr=0xca60B0F60A614C5b45a288657397C5814aB74CE8",
        },
      ],
    };

    (queryDns as jest.Mock).mockResolvedValue(mockQueryDnsResult);

    const result = await handler(mockEvent, mockContext);

    expect(queryDns).toHaveBeenCalledWith("opencerts.io", expect.any(Array));
    expect(result).toMatchObject({
      statusCode: 200,
      body: JSON.stringify(mockQueryDnsResult),
    });
  });

  it("should return 400 status code with an invalid domain", async () => {
    const mockEvent = createMockEvent({ name: "invalid-domain" });

    const result = await handler(mockEvent, mockContext);

    expect(result).toMatchObject({
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid parameters",
        details: ["Name must be a valid domain"],
      }),
    });
  });

  it("should return 400 status code when name parameter is not provided", async () => {
    const mockEvent = createMockEvent({});

    const result = await handler(mockEvent, mockContext);

    expect(result).toMatchObject({
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid parameters",
        details: ["Domain name is required"],
      }),
    });
  });

  it("should return 502 status code when DNS query throws an error", async () => {
    const mockEvent = createMockEvent({ name: "opencerts.io" });
    const mockError = new Error("DNS query failed");

    (queryDns as jest.Mock).mockRejectedValue(mockError);

    const result = await handler(mockEvent, mockContext);

    expect(queryDns).toHaveBeenCalledWith("opencerts.io", expect.any(Array));
    expect(result).toMatchObject({
      statusCode: 502,
      body: JSON.stringify({
        message: mockError.message,
      }),
    });
  });

  it("should return 502 status code when the proxied DNS query returned an invalid response", async () => {
    const mockEvent = createMockEvent({ name: "opencerts.io" });
    const mockQueryDnsResult = {
      Status: 0,
      AD: true,
      Authority: [
        {
          name: "opencerts.io",
        },
      ],
    };

    (queryDns as jest.Mock).mockResolvedValue(mockQueryDnsResult);

    const result = await handler(mockEvent, mockContext);

    expect(queryDns).toHaveBeenCalledWith("opencerts.io", expect.any(Array));
    expect(result).toMatchObject({
      statusCode: 502,
    });
  });

  describe("CORS headers", () => {
    it("should include www.opencerts.io origin in the response", async () => {
      const mockEvent = createMockEvent({ name: "opencerts.io" });
      mockEvent.headers = { Origin: "https://www.opencerts.io" };

      const result = await handler(mockEvent, mockContext);

      expect(result).toMatchObject({
        headers: {
          "Access-Control-Allow-Origin": "https://www.opencerts.io",
        },
      });
    });

    it("should include dev.opencerts.io origin in the response", async () => {
      const mockEvent = createMockEvent({ name: "opencerts.io" });
      mockEvent.headers = { Origin: "https://dev.opencerts.io" };

      const result = await handler(mockEvent, mockContext);

      expect(result).toMatchObject({
        headers: {
          "Access-Control-Allow-Origin": "https://dev.opencerts.io",
        },
      });
    });

    it("should default origin to www.opencerts.io in the response", async () => {
      const mockEvent = createMockEvent({ name: "opencerts.io" });
      mockEvent.headers = { Origin: "https://www.not-opencerts.io" };

      const result = await handler(mockEvent, mockContext);

      expect(result).toMatchObject({
        headers: {
          "Access-Control-Allow-Origin": "https://www.opencerts.io",
        },
      });
    });
  });
});
