// app/api/test/route.ts
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return Response.json({
    env_vars: {
      OSS_ACCESS_KEY_ID: process.env.OSS_ACCESS_KEY_ID ? 'SET' : 'NOT_SET',
      OSS_ACCESS_KEY_SECRET: process.env.OSS_ACCESS_KEY_SECRET ? 'SET' : 'NOT_SET',
      OSS_BUCKET: process.env.OSS_BUCKET ? 'SET' : 'NOT_SET',
      OSS_REGION: process.env.OSS_REGION || 'oss-cn-beijing'
    }
  });
}