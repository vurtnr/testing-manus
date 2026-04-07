import { z } from 'zod';

const envSchema = z.object({
  DASHSCOPE_API_KEY: z.string().min(1, 'DASHSCOPE_API_KEY is required'),
  DATABASE_URL: z.string().default('postgres://rag_user:rag_password@localhost:5432/rag_kb'),
  UPLOAD_DIR: z.string().default('./uploads'),
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = envSchema.parse({
      DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      UPLOAD_DIR: process.env.UPLOAD_DIR,
      JWT_SECRET: process.env.JWT_SECRET,
    });
  }
  return _env;
}
