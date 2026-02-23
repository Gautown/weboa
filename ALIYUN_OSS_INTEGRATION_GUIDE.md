# 阿里云 OSS 完整集成指南

## 🚀 当前状态

阿里云 OSS 的完整集成遇到了技术挑战，主要是由于阿里云 OSS SDK (`ali-oss`) 是为 Node.js 环境设计的，在浏览器客户端环境中存在模块兼容性问题。

## 🔧 技术问题分析

### 主要障碍：
1. **模块依赖问题**：`ali-oss` 依赖 `proxy-agent` 等 Node.js 特有模块
2. **环境不兼容**：SDK 包含大量服务器端逻辑，不适合直接在浏览器中使用
3. **构建错误**：Webpack/Turbopack 无法正确处理这些 Node.js 模块

### 错误详情：
```
Module not found: Can't resolve 'proxy-agent'
```

## 📋 解决方案选项

### 方案一：服务端代理模式（推荐）
创建后端 API 代理阿里云 OSS 操作：

```typescript
// pages/api/oss/[operation].ts
import OSS from 'ali-oss';

export default async function handler(req, res) {
  const client = new OSS({
    region: process.env.OSS_REGION,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET,
  });

  switch (req.method) {
    case 'GET': // 获取文件列表
      const list = await client.list();
      return res.status(200).json(list);
      
    case 'POST': // 上传文件
      // 处理文件上传逻辑
      break;
      
    case 'DELETE': // 删除文件
      // 处理文件删除逻辑
      break;
  }
}
```

### 方案二：使用浏览器兼容的替代 SDK
寻找或开发专门针对浏览器环境的 OSS 客户端：

```typescript
// 使用预签名 URL 方式
const uploadToOSS = async (file: File) => {
  // 1. 从后端获取预签名 URL
  const { url, fields } = await fetch('/api/oss/sign').then(r => r.json());
  
  // 2. 直接上传到 OSS
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, value as string);
  });
  formData.append('file', file);
  
  await fetch(url, {
    method: 'POST',
    body: formData,
  });
};
```

### 方案三：使用第三方浏览器 SDK
考虑使用社区维护的浏览器版本 OSS SDK。

## 🛠 实施步骤

### 短期解决方案（立即可用）：
1. 保持当前的模拟实现用于演示
2. 创建后端 API 代理
3. 逐步迁移功能到真实实现

### 长期解决方案：
1. 实现完整的后端代理服务
2. 开发浏览器端的轻量级 OSS 客户端
3. 添加完善的错误处理和用户体验

## 📝 配置文件示例

```typescript
// config/aliyun-oss.config.ts
export const aliyunOSSConfig = {
  // 用于后端初始化
  region: 'oss-cn-beijing',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
};

// 浏览器端配置（简化版）
export const browserOSSConfig = {
  region: 'oss-cn-beijing',
  bucket: process.env.NEXT_PUBLIC_OSS_BUCKET,
  // 不包含敏感凭证
};
```

## 🎯 当前建议

鉴于技术复杂性，建议采用**混合方案**：
- 继续使用腾讯云 COS 的完整实现作为参考
- 为阿里云 OSS 开发基于后端代理的解决方案
- 保持现有 UI 界面，替换底层实现

这样既能提供完整的用户体验，又能确保技术可行性。

## 📈 进度追踪

- [x] 腾讯云 COS：完整实现 ✅
- [ ] 阿里云 OSS：等待后端代理实现 ⏳
- [ ] OneDrive：部分实现 ⚠️

---
*最后更新：2024年*