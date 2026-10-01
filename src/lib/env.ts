import { z } from "zod";

const serverEnvSchema = z.object({
  APP_URL: z.string().url(),
  LINEAR_CLIENT_ID: z.string().min(1),
  LINEAR_REDIRECT_URI: z.string().url(),
  TOKEN_ENCRYPTION_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  PUSHER_APP_ID: z.string().min(1),
  PUSHER_KEY: z.string().min(1),
  PUSHER_SECRET: z.string().min(1),
  PUSHER_CLUSTER: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function isAppConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL &&
      process.env.LINEAR_CLIENT_ID &&
      process.env.TOKEN_ENCRYPTION_KEY,
  );
}

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    APP_URL: process.env.APP_URL ?? "http://localhost:3000",
    LINEAR_CLIENT_ID: process.env.LINEAR_CLIENT_ID,
    LINEAR_REDIRECT_URI:
      process.env.LINEAR_REDIRECT_URI ??
      "http://localhost:3000/api/auth/linear/callback",
    TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    // Optional values copied from .env.example are empty strings, not undefined.
    // Treat blank credentials as disabled so the polling fallback still works.
    PUSHER_APP_ID: process.env.PUSHER_APP_ID?.trim() || "disabled",
    PUSHER_KEY: process.env.PUSHER_KEY?.trim() || "disabled",
    PUSHER_SECRET: process.env.PUSHER_SECRET?.trim() || "disabled",
    PUSHER_CLUSTER: process.env.PUSHER_CLUSTER?.trim() || "us2",
  });

  if (!parsed.success) {
    throw new Error(
      `Missing or invalid server configuration: ${parsed.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`,
    );
  }
  return parsed.data;
}
