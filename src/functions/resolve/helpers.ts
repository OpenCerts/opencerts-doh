import { z } from "zod";

export const errorResponse = (msg: string, details?: string[]) => {
  return {
    message: msg,
    details,
  };
};

export const validateSchema = <T>(data: Record<string, unknown>, schema: z.ZodType<T>) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new SchemaValidationError(result.error);
  }
  return result;
};

export class SchemaValidationError<T = any> extends Error {
  public readonly errors: string[];

  constructor(error: z.ZodError<T>) {
    super("Schema validation error");
    this.name = "SchemaValidationError";
    this.errors = error.errors.map((error) => error.message);
  }
}
