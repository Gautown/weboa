// app/api/oss/list/route.ts
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// 阿里云 OSS REST API 实现
function getOSSHeaders(method: string, resource: string) {
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID!;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET!;
  const bucket = process.env.OSS_BUCKET!;
  const region = process.env.OSS_REGION || 'oss-cn-beijing';
  
  const date = new Date().toUTCString();
  const canonicalizedResource = `/${bucket}${resource}`;
  
  // 构造待签名字符串
  const stringToSign = `${method}


${date}
${canonicalizedResource}`;
  
  // 计算签名
  const signature = crypto
    .createHmac('sha1', accessKeySecret)
    .update(stringToSign, 'utf8')
    .digest('base64');
  
  return {
    'Date': date,
    'Authorization': `OSS ${accessKeyId}:${signature}`,
    'Host': `${bucket}.${region}.aliyuncs.com`
  };
}

export async function GET(request: NextRequest) {
  try {
    // 检查环境变量
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
    const bucket = process.env.OSS_BUCKET;
    
    // 如果没有配置环境变量，返回模拟数据
    if (!accessKeyId || !accessKeySecret || !bucket) {
      console.log('OSS credentials not configured, returning mock data');
      return Response.json({
        success: true,
        files: [
          {
            name: '示例文档.docx',
            size: 102400,
            modified: new Date('2024-01-15'),
            key: 'uploads/example.docx'
          },
          {
            name: '数据表格.xlsx',
            size: 204800,
            modified: new Date('2024-01-14'),
            key: 'uploads/data.xlsx'
          },
          {
            name: '演示文稿.pptx',
            size: 153600,
            modified: new Date('2024-01-13'),
            key: 'uploads/presentation.pptx'
          }
        ],
        totalCount: 3,
        mock: true
      });
    }
    
    // 如果配置了环境变量，则尝试真实调用
    const region = process.env.OSS_REGION || 'oss-cn-beijing';
    
    const headers = getOSSHeaders('GET', '/');
    const url = `https://${bucket}.${region}.aliyuncs.com/?max-keys=1000`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`OSS API Error: ${response.status} ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    // 简单的 XML 解析
    const files: any[] = [];
    const keyMatches = xmlText.match(/<Key>([^<]+)<\/Key>/g);
    const sizeMatches = xmlText.match(/<Size>([^<]+)<\/Size>/g);
    const lastModifiedMatches = xmlText.match(/<LastModified>([^<]+)<\/LastModified>/g);
    
    if (keyMatches && sizeMatches && lastModifiedMatches) {
      for (let i = 0; i < keyMatches.length; i++) {
        const key = keyMatches[i].replace(/<\/?Key>/g, '');
        const size = parseInt(sizeMatches[i].replace(/<\/?Size>/g, ''));
        const lastModified = lastModifiedMatches[i].replace(/<\/?LastModified>/g, '');
        
        // 过滤掉目录
        if (!key.endsWith('/')) {
          files.push({
            name: key.split('/').pop() || key,
            size: size,
            modified: new Date(lastModified),
            key: key
          });
        }
      }
    }
    
    return Response.json({
      success: true,
      files: files,
      totalCount: files.length
    });
    
  } catch (error) {
    console.error('OSS List Error:', error);
    return Response.json({
      success: false,
      error: '获取文件列表失败',
      details: (error as Error).message
    }, { status: 500 });
  }
}