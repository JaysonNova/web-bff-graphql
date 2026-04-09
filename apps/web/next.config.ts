import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

const nextConfig: NextConfig = {
  transpilePackages: ["@demo/contracts"],
  outputFileTracingRoot: path.join(currentDir, "../.."),
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
