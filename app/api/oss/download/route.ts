// app/api/oss/download/route.ts
import { NextRequest } from 'next/server';
import OSS from 'ali-oss';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  if (!key) {
    return Response.json({
      success: false,
      error: 'Missing file key'
    }, { status: 400 });
  }

  try {
    const client = new OSS({
      region: process.env.OSS_REGION || 'oss-cn-beijing',
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET!,
    });

    // 生成临时签名 URL
    const url = client.signatureUrl(key, {
      expires: 3600, // 1小时有效期
      method: 'GET'
    });

    return Response.json({
      success: true,
      downloadUrl: url
    });

  } catch (error) {
    console.error('OSS Download Error:', error);
    return Response.json({
      success: false,
      error: '生成下载链接失败',
      details: (error as Error).message
    }, { status: 500 });
  }
}