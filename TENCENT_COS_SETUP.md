# 腾讯云 COS 配置指南

## 🚀 启用腾讯云 COS 集成

### 1. 配置 COS 参数

编辑 `config/cos.config.ts` 文件：

```typescript
export const cosConfig = {
  // 存储桶配置 - 必须修改为您的实际配置
  bucket: 'your-bucket-name',    // 替换为您的存储桶名称
  region: 'ap-beijing',          // 替换为您的区域
  
  // 推荐使用临时密钥方式（更安全）
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
};
```

### 2. 测试配置

如果您想快速测试，可以在开发环境中使用模拟配置：

```typescript
// 在 cos.config.ts 中启用测试配置
getAuthorization: function (options: any, callback: Function) {
  console.warn('使用模拟 COS 授权配置');
  callback({
    TmpSecretId: 'your-test-secret-id',
    TmpSecretKey: 'your-test-secret-key',
    SecurityToken: 'your-test-token',
    ExpiredTime: Math.floor(Date.now() / 1000) + 3600,
  });
}
```

### 3. 功能特性

启用后的腾讯云 COS 集成包含：

✅ **文件列表获取** - 实时显示存储桶中的文件
✅ **文件上传** - 支持大文件分片上传
✅ **文件下载** - 提供临时访问链接
✅ **进度显示** - 上传过程实时进度反馈
✅ **错误处理** - 完善的异常捕获和用户提示

### 4. 安全建议

- 生产环境务必使用临时密钥而非永久密钥
- 建议通过后端服务签发临时凭证
- 配置合适的 CORS 规则
- 设置文件访问权限策略

### 5. 故障排除

常见问题及解决方案：

1. **COS 客户端初始化失败**
   - 检查网络连接
   - 验证配置参数是否正确
   - 确认 COS SDK 版本兼容性

2. **文件上传失败**
   - 检查存储桶权限设置
   - 验证文件大小限制
   - 确认网络稳定性

3. **文件列表为空**
   - 检查存储桶是否包含文件
   - 验证访问权限配置
   - 确认区域配置正确

## 📝 后续计划

- [ ] 添加文件预览功能
- [ ] 实现文件搜索和筛选
- [ ] 支持文件夹操作
- [ ] 添加批量操作功能