import type { NextConfig } from "next";
const config: NextConfig = {reactStrictMode:true, poweredByHeader:false, productionBrowserSourceMaps:false,outputFileTracingIncludes:{'/api/v1/**/*':['./artifacts/graph.json','./artifacts/graph-manifest.json','./artifacts/landmarks.json','./models/manifest.json']}};
export default config;
