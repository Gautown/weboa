// app/api/oss/upload/route.ts
import { NextRequest } from 'next/server';
import OSS from 'ali-oss';

export async function POST(request: NextRequest) {
  try {
    // 获取表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return Response.json({
        success: false,
        error: 'No file uploaded'
      }, { status: 400 });
    }

    // 初始化 OSS 客户端
    const client = new OSS({
      region: process.env.OSS_REGION || 'oss-cn-beijing',
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET!,
    });

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 上传到 OSS
    const result = await client.put(
      `uploads/${file.name}`,
      buffer
    );

    return Response.json({
      success: true,
      url: result.url,
      name: file.name
    });

  } catch (error) {
    console.error('OSS Upload Error:', error);
    return Response.json({
      success: false,
      error: '文件上传失败',
      details: (error as Error).message
    }, { status: 500 });
  }
}