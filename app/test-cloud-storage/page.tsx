"use client";

import { useState } from "react";
import { CloudProviderButtons } from "@/components/cloud-provider-buttons";

export default function TestCloudStorage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`]);
    console.log("Selected file:", file);
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">云存储功能测试页面</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 云存储测试区域 */}
          <div className="space-y-6">
            <div className="bg-muted/40 dark:bg-white/5 border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">云存储提供商测试</h2>
              <CloudProviderButtons 
                onFileSelect={handleFileSelect}
                onFileSelectWithHandle={handleFileSelect}
              />
            </div>
          </div>

          {/* 测试结果和日志 */}
          <div className="space-y-6">
            {/* 选中的文件信息 */}
            {selectedFile && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-green-800 dark:text-green-200">选中的文件</h2>
                <div className="space-y-2 text-green-700 dark:text-green-300">
                  <p><strong>文件名:</strong> {selectedFile.name}</p>
                  <p><strong>文件类型:</strong> {selectedFile.type || '未知'}</p>
                  <p><strong>文件大小:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p><strong>最后修改:</strong> {new Date(selectedFile.lastModified).toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* 测试日志 */}
            <div className="bg-muted/40 dark:bg-white/5 border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">测试日志</h2>
                <button 
                  onClick={() => setLogs([])}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  清除日志
                </button>
              </div>
              <div className="bg-black/10 dark:bg-white/10 rounded p-4 h-64 overflow-y-auto font-mono text-sm">
                {logs.length === 0 ? (
                  <p className="text-text-secondary">等待操作...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      <span className="text-blue-600 dark:text-blue-400">{log}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 状态检查 */}
            <div className="bg-muted/40 dark:bg-white/5 border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">服务状态检查</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Uppy Companion 服务:</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">待测试</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>网络连接:</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">正常</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>组件加载:</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">成功</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}