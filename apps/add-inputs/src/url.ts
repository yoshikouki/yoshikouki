import { z } from "zod";

const UrlSchema = z.string().url();

export const getUrl = (): string => {
  const url: string | undefined = process.env.URL || process.argv[2];
  try {
    UrlSchema.parse(url);
    return url;
  } catch (error) {
    throw new Error(
      `URL Error: ${error instanceof Error ? error.message : error}`,
    );
  }
};
