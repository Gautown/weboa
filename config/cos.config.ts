// 腾讯云 COS 配置文件
// 请将此文件中的占位符替换为您的实际配置

export const cosConfig = {
  // 存储桶配置
  bucket: 'your-bucket-name',    // 替换为您的存储桶名称
  region: 'ap-beijing',          // 替换为您的区域 (如: ap-beijing, ap-shanghai 等)
  
  // 认证配置 - 请根据您的实际情况选择一种方式
  
  // 方式1: 使用永久密钥 (不推荐用于前端)
  /*
  secretId: 'your-secret-id',
  secretKey: 'your-secret-key',
  */
  
  // 方式2: 使用临时密钥 (推荐) - 需要后端提供签名服务
  getAuthorization: async function (options: any) {
    try {
      // 调用您的后端 API 获取临时密钥
      const response = await fetch('/api/cos-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: options.Method,
          pathname: options.Pathname,
          query: options.Query,
          headers: options.Headers,
        }),
      });
      
      if (!response.ok) {
        throw new Error('获取 COS 授权失败');
      }
      
      const authData = await response.json();
      return {
        TmpSecretId: authData.tmpSecretId,
        TmpSecretKey: authData.tmpSecretKey,
        SecurityToken: authData.securityToken,
        ExpiredTime: authData.expiredTime,
      };
    } catch (error) {
      console.error('COS 授权错误:', error);
      throw error;
    }
  },
  
  // 方式3: 临时测试用的模拟配置
  /*
  getAuthorization: function (options: any, callback: Function) {
    // 仅用于开发测试，请替换为真实的授权逻辑
    console.warn('使用模拟 COS 授权配置');
    callback({
      TmpSecretId: 'your-tmp-secret-id',
      TmpSecretKey: 'your-tmp-secret-key',
      SecurityToken: 'your-security-token',
      ExpiredTime: Math.floor(Date.now() / 1000) + 3600,
    });
  }
  */
};

// 文件类型过滤配置
export const allowedFileTypes = [
  '.docx', '.doc',   // Word 文档
  '.xlsx', '.xls',   // Excel 表格
  '.pptx', '.ppt',   // PowerPoint 演示文稿
  '.pdf'             // PDF 文档
];

// 上传配置
export const uploadConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  retryTimes: 3,                  // 重试次数
  timeout: 60000,                 // 超时时间(ms)
};