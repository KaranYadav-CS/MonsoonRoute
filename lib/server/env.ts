/**
 * MonsoonRoute — Environment variable validation (server-only).
 *
 * Fail fast at startup if required values are missing, invalid, or leaked.
 * NEVER import this module from client components.
 *
 * Usage (top of any server entry point):
 *   import { env } from '@/lib/server/env';
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sha256Hex = z.string().regex(/^[a-f0-9]{64}$/, 'must be 64 lowercase hex chars');
const sha1Hex = z.string().regex(/^[a-f0-9]{40}$/, 'must be 40 lowercase hex chars');
const uuidV4 = z.string().uuid('must be a valid UUID');
const boolString = z.enum(['true', 'false']).transform((v) => v === 'true');

const SECRET_NAMES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'RATE_LIMIT_HMAC_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'DATABASE_URL',
  'GITHUB_OAUTH_CLIENT_SECRET',
  'VERCEL_TOKEN',
  'KAGGLE_KEY',
  'KAGGLE_API_TOKEN',
  'NVIDIA_API_KEY',
  'HF_TOKEN',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
] as const;

// ---------------------------------------------------------------------------
// A. Public env (NEXT_PUBLIC_* — safe for the browser bundle)
// ---------------------------------------------------------------------------

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

// ---------------------------------------------------------------------------
// B. Server env (everything else; never exposed to client)
// ---------------------------------------------------------------------------

const serverEnvSchema = z
  .object({
    // -- A. App identity ---------------------------------------------------
    APP_ENV: z.enum(['local', 'ci', 'staging', 'production']),
    FIXTURE_MODE: boolString.default('false'),
    APP_URL: z.string().url('APP_URL must be a valid URL'),
    CITY_ID: z
      .literal('delhi-central', {
        errorMap: () => ({ message: 'CITY_ID must be exactly delhi-central' }),
      }),
    GRAPH_VERSION: uuidV4.optional().or(z.literal('')),
    GRAPH_SHA256: sha256Hex.optional().or(z.literal('')),
    RULESET_ID: z
      .literal('relative-risk-v1', {
        errorMap: () => ({
          message: 'RULESET_ID must be exactly relative-risk-v1',
        }),
      }),
    LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),
    BUILD_SHA: z.string().optional().default(''),

    // -- B/C. Supabase (server-side refs) ----------------------------------
    SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().default(''),
    RATE_LIMIT_HMAC_KEY: z.string().default(''),

    // -- D. AWS runtime ----------------------------------------------------
    AWS_ENABLED: boolString.default('false'),
    AWS_REGION: z
      .literal('ap-south-1', {
        errorMap: () => ({
          message: 'AWS_REGION must be exactly ap-south-1',
        }),
      })
      .default('ap-south-1'),
    AWS_ROLE_ARN: z.string().optional().default(''),
    AWS_VISION_QUEUE_URL: z.string().optional().default(''),
    AWS_INGEST_FUNCTION_ARN: z.string().optional().default(''),
    AWS_PROFILE: z.string().optional().default(''),

    // -- E. Lambda variables (documentation; not consumed by Next.js) ------
    HF_MODEL_ID: z
      .literal('prithivMLmods/Flood-Image-Detection', {
        errorMap: () => ({
          message:
            'HF_MODEL_ID must be exactly prithivMLmods/Flood-Image-Detection',
        }),
      })
      .optional()
      .default('prithivMLmods/Flood-Image-Detection'),
    MODEL_REVISION: sha1Hex.optional().or(z.literal('')).default(''),
    MODEL_KEY: z.string().optional().default(''),
    MODEL_SHA256: sha256Hex.optional().or(z.literal('')).default(''),
    PREPROCESSOR_KEY: z.string().optional().default(''),
    PREPROCESSOR_SHA256: sha256Hex.optional().or(z.literal('')).default(''),
    ORT_THREADS: z.coerce.number().int().positive().default(2),
  })
  .superRefine((data, ctx) => {
    const appEnv = data.APP_ENV;
    const isProduction = appEnv === 'production';
    const isStaging = appEnv === 'staging';
    const isHosted = isProduction || isStaging;

    // ------------------------------------------------------------------
    // Production / staging require HTTPS APP_URL
    // ------------------------------------------------------------------
    if (isHosted && !data.APP_URL.startsWith('https://')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['APP_URL'],
        message: `APP_URL must use https when APP_ENV=${appEnv}`,
      });
    }

    // ------------------------------------------------------------------
    // Production / staging reject localhost URLs
    // ------------------------------------------------------------------
    if (isHosted) {
      const localhostRe = /^https?:\/\/(localhost|127\.0\.0\.1)/;
      if (localhostRe.test(data.APP_URL)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['APP_URL'],
          message: `APP_URL must not be localhost when APP_ENV=${appEnv}`,
        });
      }
      if (localhostRe.test(data.SUPABASE_URL)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SUPABASE_URL'],
          message: `SUPABASE_URL must not be localhost when APP_ENV=${appEnv}`,
        });
      }
    }

    if (isProduction && !data.SUPABASE_URL.startsWith('https://')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_URL'],
        message: 'SUPABASE_URL must use https when APP_ENV=production',
      });
    }

    // ------------------------------------------------------------------
    // FIXTURE_MODE=true guardrails
    // ------------------------------------------------------------------
    if (data.FIXTURE_MODE) {
      if (isProduction) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FIXTURE_MODE'],
          message: 'FIXTURE_MODE=true is rejected when APP_ENV=production',
        });
      }
      const supabaseHostedRe = /\.supabase\.co/;
      if (supabaseHostedRe.test(data.SUPABASE_URL)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FIXTURE_MODE'],
          message:
            'FIXTURE_MODE=true is rejected when SUPABASE_URL is hosted production',
        });
      }
      if (data.AWS_ENABLED) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FIXTURE_MODE'],
          message: 'FIXTURE_MODE=true is rejected when AWS_ENABLED=true',
        });
      }
    }

    // ------------------------------------------------------------------
    // SUPABASE_URL must equal the public value
    // ------------------------------------------------------------------
    const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    if (publicUrl && data.SUPABASE_URL !== publicUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_URL'],
        message:
          'SUPABASE_URL must equal NEXT_PUBLIC_SUPABASE_URL',
      });
    }

    // ------------------------------------------------------------------
    // When AWS_ENABLED=true, require ARN/queue/function
    // ------------------------------------------------------------------
    if (data.AWS_ENABLED) {
      if (!data.AWS_ROLE_ARN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AWS_ROLE_ARN'],
          message: 'AWS_ROLE_ARN is required when AWS_ENABLED=true',
        });
      }
      if (!data.AWS_VISION_QUEUE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AWS_VISION_QUEUE_URL'],
          message: 'AWS_VISION_QUEUE_URL is required when AWS_ENABLED=true',
        });
      }
      if (!data.AWS_INGEST_FUNCTION_ARN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AWS_INGEST_FUNCTION_ARN'],
          message:
            'AWS_INGEST_FUNCTION_ARN is required when AWS_ENABLED=true',
        });
      }
    }

    // ------------------------------------------------------------------
    // RATE_LIMIT_HMAC_KEY must decode to >=32 bytes when present
    // ------------------------------------------------------------------
    if (data.RATE_LIMIT_HMAC_KEY) {
      try {
        const decoded = Buffer.from(data.RATE_LIMIT_HMAC_KEY, 'base64');
        if (decoded.length < 32) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['RATE_LIMIT_HMAC_KEY'],
            message:
              'RATE_LIMIT_HMAC_KEY must decode to >= 32 bytes',
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['RATE_LIMIT_HMAC_KEY'],
          message: 'RATE_LIMIT_HMAC_KEY must be valid base64',
        });
      }
    }

    // ------------------------------------------------------------------
    // Production requires non-empty service key, HMAC key, graph & build SHAs
    // ------------------------------------------------------------------
    if (isProduction) {
      if (!data.SUPABASE_SERVICE_ROLE_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SUPABASE_SERVICE_ROLE_KEY'],
          message:
            'SUPABASE_SERVICE_ROLE_KEY is required when APP_ENV=production',
        });
      }
      if (!data.RATE_LIMIT_HMAC_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['RATE_LIMIT_HMAC_KEY'],
          message: 'RATE_LIMIT_HMAC_KEY is required when APP_ENV=production',
        });
      }
      if (!data.GRAPH_VERSION) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['GRAPH_VERSION'],
          message: 'GRAPH_VERSION is required when APP_ENV=production',
        });
      }
      if (!data.GRAPH_SHA256) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['GRAPH_SHA256'],
          message: 'GRAPH_SHA256 is required when APP_ENV=production',
        });
      }
      if (!data.BUILD_SHA) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['BUILD_SHA'],
          message: 'BUILD_SHA is required when APP_ENV=production',
        });
      }
    }

    // ------------------------------------------------------------------
    // Reject server secret names that appear with NEXT_PUBLIC_ prefix
    // ------------------------------------------------------------------
    for (const name of SECRET_NAMES) {
      const publicKey = `NEXT_PUBLIC_${name}`;
      if (process.env[publicKey] !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [publicKey],
          message: `Server secret ${name} must not have a NEXT_PUBLIC_ prefixed copy`,
        });
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

// ---------------------------------------------------------------------------
// Parse & export (fail fast on import)
// ---------------------------------------------------------------------------

function parseEnvOrDie<T>(
  schema: z.ZodSchema<T>,
  label: string,
): T {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => {
        const path = issue.path.join('.');
        // NEVER print the value — only the variable name and the rule.
        return `  ✗ ${path || '(root)'}: ${issue.message}`;
      })
      .join('\n');
    throw new Error(
      `\n[env] ${label} validation failed:\n${formatted}\n`,
    );
  }
  return result.data;
}

export const publicEnv: PublicEnv = parseEnvOrDie(
  publicEnvSchema,
  'publicEnv (NEXT_PUBLIC_*)',
);

export const env: ServerEnv = parseEnvOrDie(
  serverEnvSchema,
  'serverEnv',
);
