#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 测试 GitHub 仓库链接...\n');

try {
  // 获取远程仓库信息
  const remotes = execSync('git remote -v', { encoding: 'utf8' });
  console.log('📋 远程仓库信息:');
  console.log(remotes || '暂无远程仓库配置\n');
  
  // 获取当前分支
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`🌿 当前分支: ${branch}\n`);
  
  // 获取最后一次提交信息
  const lastCommit = execSync('git log -1 --pretty=format:"%h - %an, %ar : %s"', { encoding: 'utf8' });
  console.log('📝 最后一次提交:');
  console.log(lastCommit + '\n');
  
  // 获取仓库状态
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim()) {
    console.log('⚠️  有未提交的更改:');
    console.log(status);
  } else {
    console.log('✅ 工作区干净，所有更改已提交\n');
  }
  
  console.log('🎉 GitHub 仓库链接测试完成！');
  console.log('\n💡 下一步操作:');
  console.log('1. 在 GitHub 上创建新的仓库');
  console.log('2. 运行: git remote add origin <你的仓库URL>');
  console.log('3. 运行: git push -u origin main');
  
} catch (error) {
  console.error('❌ 测试过程中出现错误:', error.message);
}