import { z } from "zod";
import { parse } from "tldts";

export const queryParamSchema = z.object({
  name: z.string({ message: "Domain name is required" }).refine((name) => parse(name).isIcann, {
    message: "Name must be a valid domain",
  }),
});

export const dnsResultSchema = z.object({
  Status: z.number(),
  AD: z.boolean(),
  Answer: z.array(
    z.object({
      name: z.string(),
      data: z.string(),
    }),
  ),
});
