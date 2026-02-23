/**
 * Cloudflare Worker 入口文件
 * 用于部署 Next.js 静态站点到 Cloudflare Worker
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 处理静态资源请求
    if (url.pathname.startsWith('/_next/') || 
        url.pathname.startsWith('/static/') ||
        url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      // 这些请求应该由 assets 处理
      return fetch(request);
    }
    
    // 对于其他路由，返回 index.html (SPA 路由)
    const indexPath = '/index.html';
    const indexResponse = await env.ASSETS.fetch(new URL(indexPath, request.url));
    
    // 创建新的响应，保持原始状态码但修改内容
    return new Response(indexResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate'
      }
    });
  }
};