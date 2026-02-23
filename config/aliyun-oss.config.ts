// 阿里云 OSS 配置文件
// 请将此文件中的占位符替换为您的实际配置

export const aliyunOSSConfig = {
  // 存储桶配置
  region: 'oss-cn-beijing',      // 替换为您的区域 (如: oss-cn-beijing, oss-cn-shanghai 等)
  accessKeyId: 'your-access-key-id',     // 替换为您的 AccessKey ID
  accessKeySecret: 'your-access-key-secret', // 替换为您的 AccessKey Secret
  bucket: 'your-bucket-name',    // 替换为您的存储桶名称
  
  // STS 临时凭证配置 (推荐方式)
  /*
  stsToken: 'your-sts-token',
  expiration: '2023-12-31T23:59:59Z',
  */
  
  // 自定义域名配置 (可选)
  /*
  secure: true,
  endpoint: 'your-custom-domain.com',
  cname: true,
  */
};

// 文件类型过滤配置
export const aliyunAllowedFileTypes = [
  '.docx', '.doc',   // Word 文档
  '.xlsx', '.xls',   // Excel 表格
  '.pptx', '.ppt',   // PowerPoint 演示文稿
  '.pdf'             // PDF 文档
];

// 上传配置
export const aliyunUploadConfig = {
  maxSize: 100 * 1024 * 1024, // 100MB
  retryTimes: 3,              // 重试次数
  timeout: 60000,             // 超时时间(ms)
  // 分片上传配置
  multipartUpload: {
    partSize: 1024 * 1024,    // 1MB 分片大小
    parallel: 5,              // 并行上传数
  }
};