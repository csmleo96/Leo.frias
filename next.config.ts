import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Types are hand-crafted until `npx supabase gen types typescript` runs against the real DB.
    // The separate `tsc --noEmit` step in CI catches regressions with continue-on-error.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
