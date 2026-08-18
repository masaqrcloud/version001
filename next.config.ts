import type { NextConfig } from "next";
import { detectLanIps } from "./src/lib/public-url";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "@prisma/client"],
  agentRules: false,
  allowedDevOrigins: detectLanIps(),
};

export default nextConfig;
