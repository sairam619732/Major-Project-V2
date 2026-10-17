import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /api/dataset reads the dataset from data/ (outside public/), so ship it with that route.
  outputFileTracingIncludes: {
    "/api/dataset": ["./data/raw/*.csv", "./data/processed/*.json"],
  },
};

export default nextConfig;
