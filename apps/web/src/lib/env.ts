import { z } from "zod";

const EnvSchema = z.object({
  VITE_API_URL: z.string().url().default("http://localhost:4000"),
  VITE_AZURE_AD_TENANT_ID: z.string().min(1),
  VITE_AZURE_AD_CLIENT_ID: z.string().min(1),
});

export const env = EnvSchema.parse(import.meta.env);

