// app/api/oss/delete/route.ts
import { NextRequest } from 'next/server';
import OSS from 'ali-oss';

export async function DELETE(request: NextRequest) {
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

    // 删除文件
    await client.delete(key);

    return Response.json({
      success: true,
      message: '文件删除成功'
    });

  } catch (error) {
    console.error('OSS Delete Error:', error);
    return Response.json({
      success: false,
      error: '文件删除失败',
      details: (error as Error).message
    }, { status: 500 });
  }
}