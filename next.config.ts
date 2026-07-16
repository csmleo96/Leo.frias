import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    // Types are hand-crafted until `npx supabase gen types typescript` runs against the real DB.
    // The separate `tsc --noEmit` step in CI catches regressions with continue-on-error.
    ignoreBuildErrors: true,
  },
  // lib/vault/storage.ts builds file paths with `path.join(process.cwd(), 'vault', ...parts)`.
  // The rest-parameter makes the target unresolvable at trace time, so Node File Trace
  // falls back to sweeping in the whole project (source .ts/.tsx, docs, scripts, screenshots)
  // for every route that imports the vault module. None of it is needed at runtime — only
  // the compiled output ever executes — so it's safe to exclude wholesale.
  outputFileTracingExcludes: {
    '/api/vault/**': [
      '*.md',
      'Dockerfile',
      '*.mjs',
      'compose*.yaml',
      '*.log',
      'components.json',
      'next.config.ts',
      'proxy.ts',
      'tsconfig*.json',
      'vercel.json',
      'public/**',
      'screenshots/**',
      'scripts/**',
      'supabase/**',
      'types/**',
      'app/**/*.ts',
      'app/**/*.tsx',
      'components/**',
      'lib/**/*.ts',
    ],
  },
};

export default nextConfig;
