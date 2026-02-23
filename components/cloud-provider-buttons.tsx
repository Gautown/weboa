"use client";

import { useState, useRef, useEffect } from "react";
import { useExtracted } from "next-intl";
import Uppy from "@uppy/core";
// 注：由于百度网盘和阿里网盘无官方Uppy支持，使用腾讯云COS和阿里云OSS作为替代
// 百度网盘和阿里网盘需要自定义OAuth集成，暂不支持直接替换
import AwsS3 from "@uppy/aws-s3";
import Compressor from "@uppy/compressor";
import OneDrive from "@uppy/onedrive";
import Dashboard from "@uppy/dashboard";

interface CloudProviderButtonsProps {
  onFileSelect?: (file: File) => void;
  onFileSelectWithHandle?: (file: File, handle?: FileSystemFileHandle) => void;
  className?: string;
}

export function CloudProviderButtons({
  onFileSelect,
  onFileSelectWithHandle,
  className = "",
}: CloudProviderButtonsProps) {
  const t = useExtracted();
  const uppyRef = useRef<Uppy | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  
  // 腾讯云 COS 相关状态
  const [tencentCOSFiles, setTencentCOSFiles] = useState<Array<{
    name: string;
    size: number;
    modified: Date;
    key: string;
  }>>([
    { name: 'example.docx', size: 1024000, modified: new Date(), key: 'doc/example.docx' },
    { name: 'report.xlsx', size: 2048000, modified: new Date(), key: 'excel/report.xlsx' },
    { name: 'presentation.pptx', size: 512000, modified: new Date(), key: 'ppt/presentation.pptx' },
    { name: 'document.pdf', size: 1536000, modified: new Date(), key: 'pdf/document.pdf' },
  ]);
  const [selectedTencentCOSFile, setSelectedTencentCOSFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 阿里云 OSS 相关状态
  const [aliyunOSSFiles, setAliyunOSSFiles] = useState<Array<{
    name: string;
    size: number;
    modified: Date;
    key: string;
  }>>([
    { name: 'data.xlsx', size: 3072000, modified: new Date(), key: 'data/data.xlsx' },
    { name: 'chart.pptx', size: 768000, modified: new Date(), key: 'charts/chart.pptx' },
  ]);
  const [selectedAliyunOSSFile, setSelectedAliyunOSSFile] = useState<string | null>(null);
  
  // OneDrive 相关状态
  const [oneDriveFiles, setOneDriveFiles] = useState<Array<{
    name: string;
    size: number;
    modified: Date;
    id: string;
  }>>([
    { name: 'meeting-notes.docx', size: 256000, modified: new Date(), id: '1' },
    { name: 'budget.xlsx', size: 1280000, modified: new Date(), id: '2' },
  ]);
  const [selectedOneDriveFile, setSelectedOneDriveFile] = useState<string | null>(null);

  useEffect(() => {
    // 初始化 Uppy 实例
    const uppy = new Uppy({
      debug: process.env.NODE_ENV === "development",
      autoProceed: false,
      restrictions: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxNumberOfFiles: 1,
        allowedFileTypes: [
          ".docx",
          ".doc",
          ".xlsx",
          ".xls",
          ".pptx",
          ".ppt",
          ".pdf",
        ],
      },
    });

    // 添加基础插件
    try {
      uppy.use(Compressor);
    } catch (error) {
      console.warn("Failed to initialize Compressor plugin:", error);
    }

    try {
      uppy.use(OneDrive, {
        companionUrl: "https://companion.uppy.io",
        companionCookiesRule: "same-origin",
      });
    } catch (error) {
      console.warn("Failed to initialize OneDrive plugin:", error);
    }

    // 处理文件添加事件
    uppy.on("file-added", (file: any) => {
      console.log("File added:", file);
      if (file.data instanceof File) {
        if (onFileSelectWithHandle) {
          onFileSelectWithHandle(file.data);
        } else if (onFileSelect) {
          onFileSelect(file.data);
        }
        // 关闭 dashboard
        setActiveProvider(null);
      }
    });

    uppy.on("complete", (result) => {
      console.log("Upload complete:", result);
      if (result.successful && result.successful.length > 0) {
        const uploadedFile = result.successful[0];
        console.log("Uploaded file:", uploadedFile);
      }
    });

    // 添加网络错误处理
    uppy.on("error", (error) => {
      console.error("Uppy error:", error);
      if (error.message && error.message.includes("companion.uppy.io")) {
        console.warn("Companion service unavailable");
      }
    });

    uppyRef.current = uppy;

    // 清理函数
    return () => {
      if (uppyRef.current) {
        uppyRef.current.cancelAll();
        // @ts-ignore
        uppyRef.current.close?.();
      }
    };
  }, [onFileSelect, onFileSelectWithHandle]);

  const openProvider = (provider: string) => {
    console.log(`Opening provider: ${provider}`);
    
    if (!uppyRef.current) {
      console.error("Uppy instance not initialized");
      return;
    }

    setActiveProvider(provider);
    
    // 为不同提供商使用不同的处理方式
    if (provider === 'TencentCOS') {
      // 腾讯云 COS 专用处理
      openTencentCOS();
    } else if (provider === 'AliyunOSS') {
      // 阿里云 OSS 专用处理
      openAliyunOSS();
    } else if (provider === 'OneDrive') {
      // OneDrive 专用处理
      openOneDrive();
    }
  };

  const openTencentCOS = () => {
    // 腾讯云 COS 专用逻辑
    console.log("Opening Tencent Cloud COS interface");
    // 直接设置活动提供商为腾讯云 COS，触发内容显示
    setActiveProvider('TencentCOS');
  };

  const openAliyunOSS = () => {
    // 阿里云 OSS 专用逻辑
    console.log("Opening Alibaba Cloud OSS interface");
    // 直接设置活动提供商为阿里云 OSS，触发内容显示
    setActiveProvider('AliyunOSS');
  };

  const openOneDrive = () => {
    // OneDrive 专用逻辑
    console.log("Opening OneDrive interface");
    // 直接设置活动提供商为 OneDrive，触发内容显示
    setActiveProvider('OneDrive');
  };

  // 腾讯云 COS 处理函数
  const refreshTencentCOS = () => {
    setIsLoading(true);
    // 模拟刷新操作
    setTimeout(() => {
      // 这里可以添加真实的腾讯云 COS API 调用
      console.log('Refreshing Tencent COS files...');
      setIsLoading(false);
    }, 1000);
  };

  const handleTencentCOSUpload = () => {
    // 触发文件选择
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('Uploading file to Tencent COS:', file.name);
        // 这里可以添加真实的上传逻辑
        alert(`文件 ${file.name} 已选择，上传功能待实现`);
      }
    };
    input.click();
  };

  const handleTencentCOSDownload = () => {
    if (selectedTencentCOSFile) {
      console.log('Downloading file from Tencent COS:', selectedTencentCOSFile);
      // 这里可以添加真实的下载逻辑
      alert(`正在下载文件: ${selectedTencentCOSFile}`);
    }
  };

  const handleTencentCOSSelect = (fileName: string) => {
    setSelectedTencentCOSFile(selectedTencentCOSFile === fileName ? null : fileName);
    if (selectedTencentCOSFile !== fileName) {
      console.log('Selected file:', fileName);
      // 这里可以添加文件预览逻辑
    }
  };

  // 阿里云 OSS 处理函数
  const refreshAliyunOSS = () => {
    setIsLoading(true);
    setTimeout(() => {
      console.log('Refreshing Aliyun OSS files...');
      setIsLoading(false);
    }, 1000);
  };

  const handleAliyunOSSUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('Uploading file to Aliyun OSS:', file.name);
        alert(`文件 ${file.name} 已选择，上传功能待实现`);
      }
    };
    input.click();
  };

  const handleAliyunOSSDownload = () => {
    if (selectedAliyunOSSFile) {
      console.log('Downloading file from Aliyun OSS:', selectedAliyunOSSFile);
      alert(`正在下载文件: ${selectedAliyunOSSFile}`);
    }
  };

  const handleAliyunOSSSelect = (fileName: string) => {
    setSelectedAliyunOSSFile(selectedAliyunOSSFile === fileName ? null : fileName);
  };

  // OneDrive 处理函数
  const refreshOneDrive = () => {
    setIsLoading(true);
    setTimeout(() => {
      console.log('Refreshing OneDrive files...');
      setIsLoading(false);
    }, 1000);
  };

  const handleOneDriveUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('Uploading file to OneDrive:', file.name);
        alert(`文件 ${file.name} 已选择，上传功能待实现`);
      }
    };
    input.click();
  };

  const handleOneDriveDownload = () => {
    if (selectedOneDriveFile) {
      console.log('Downloading file from OneDrive:', selectedOneDriveFile);
      alert(`正在下载文件: ${selectedOneDriveFile}`);
    }
  };

  const handleOneDriveSelect = (fileName: string) => {
    setSelectedOneDriveFile(selectedOneDriveFile === fileName ? null : fileName);
  };

  // 渲染文件列表
  const renderTencentCOSFileList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-2"></div>
            <p className="text-text-secondary">加载文件列表...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {tencentCOSFiles.map((file) => (
          <div
            key={file.key}
            onClick={() => handleTencentCOSSelect(file.name)}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors $ {
              selectedTencentCOSFile === file.name
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-border hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-text-secondary">
                  {(file.size / 1024 / 1024).toFixed(1)} MB • {file.modified.toLocaleDateString()}
                </p>
              </div>
            </div>
            {selectedTencentCOSFile === file.name && (
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderAliyunOSSFileList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-2"></div>
            <p className="text-text-secondary">加载文件列表...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {aliyunOSSFiles.map((file) => (
          <div
            key={file.key}
            onClick={() => handleAliyunOSSSelect(file.name)}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors $ {
              selectedAliyunOSSFile === file.name
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                : 'border-border hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-text-secondary">
                  {(file.size / 1024 / 1024).toFixed(1)} MB • {file.modified.toLocaleDateString()}
                </p>
              </div>
            </div>
            {selectedAliyunOSSFile === file.name && (
              <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderOneDriveFileList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mb-2"></div>
            <p className="text-text-secondary">加载文件列表...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {oneDriveFiles.map((file) => (
          <div
            key={file.id}
            onClick={() => handleOneDriveSelect(file.name)}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors $ {
              selectedOneDriveFile === file.name
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                : 'border-border hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-text-secondary">
                  {(file.size / 1024 / 1024).toFixed(1)} MB • {file.modified.toLocaleDateString()}
                </p>
              </div>
            </div>
            {selectedOneDriveFile === file.name && (
              <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderProviderContent = (provider: string) => {
    switch (provider) {
      case 'TencentCOS':
        return (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold">腾讯云 COS</h4>
                  <p className="text-sm text-text-secondary">对象存储服务</p>
                </div>
              </div>
              <button
                onClick={() => refreshTencentCOS()}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="刷新"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              {renderTencentCOSFileList()}
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="text-sm text-text-secondary">
                共 {tencentCOSFiles.length} 个文件
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleTencentCOSUpload}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  上传文件
                </button>
                <button
                  onClick={handleTencentCOSDownload}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-sm font-medium"
                  disabled={!selectedTencentCOSFile}
                >
                  下载选中文件
                </button>
              </div>
            </div>
          </div>
        );
      case 'AliyunOSS':
        return (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold">阿里云 OSS</h4>
                  <p className="text-sm text-text-secondary">对象存储服务</p>
                </div>
              </div>
              <button
                onClick={() => refreshAliyunOSS()}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="刷新"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              {renderAliyunOSSFileList()}
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="text-sm text-text-secondary">
                共 {aliyunOSSFiles.length} 个文件
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAliyunOSSUpload}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  上传文件
                </button>
                <button
                  onClick={handleAliyunOSSDownload}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-sm font-medium"
                  disabled={!selectedAliyunOSSFile}
                >
                  下载选中文件
                </button>
              </div>
            </div>
          </div>
        );
      case 'OneDrive':
        return (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.4 15.6l-3.6-2.1 3.6-2.1v4.2zm-10.8 0V11.4l3.6 2.1-3.6 2.1zm5.4-1.2l-3.6-2.1 3.6-2.1 3.6 2.1-3.6 2.1z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold">OneDrive</h4>
                  <p className="text-sm text-text-secondary">Microsoft 云存储</p>
                </div>
              </div>
              <button
                onClick={() => refreshOneDrive()}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="刷新"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              {renderOneDriveFileList()}
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="text-sm text-text-secondary">
                共 {oneDriveFiles.length} 个文件
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleOneDriveUpload}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  上传文件
                </button>
                <button
                  onClick={handleOneDriveDownload}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-sm font-medium"
                  disabled={!selectedOneDriveFile}
                >
                  下载选中文件
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-text-secondary">请选择一个云存储提供商</p>
          </div>
        );
    }
  };

  const openGenericProvider = (provider: string) => {
    // 通用提供商处理（如 OneDrive）
    setTimeout(() => {
      if (uppyRef.current) {
        try {
          // @ts-ignore
          const existingDashboard = uppyRef.current.getPlugin('Dashboard');
          if (!existingDashboard) {
            console.log("Initializing Dashboard plugin");
            // @ts-ignore
            uppyRef.current.use(Dashboard, {
              id: 'Dashboard',
              trigger: '.uppy-Dashboard-open',
              theme: "auto",
              width: "100%",
              height: 400,
              note: t("select_files_from_cloud_storage"),
              proudlyDisplayPoweredByUppy: false,
              showSelectedFiles: true,
              showRemoveButtonAfterComplete: true,
              doneButtonHandler: null,
            });
          }
          
          // 根据提供商打开对应的界面
          setTimeout(() => {
            console.log(`Attempting to open ${provider} interface`);
            const providerButton = document.querySelector(`[data-uppy-provider="${provider}"]`);
            if (providerButton) {
              console.log(`Found provider button for ${provider}`);
              (providerButton as HTMLElement).click();
            } else {
              console.log(`Provider button not found, trying generic open button`);
              // 如果找不到特定提供商按钮，触发通用打开按钮
              const openButton = document.querySelector('.uppy-Dashboard-open');
              if (openButton) {
                console.log("Triggering generic dashboard open");
                (openButton as HTMLElement).click();
              } else {
                console.error("No open button found");
              }
            }
          }, 100);
        } catch (error) {
          console.error(`Error opening ${provider}:`, error);
        }
      }
    }, 100);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-muted/40 dark:bg-white/5 border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">
          {t("Cloud Storage Providers")}
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          {t("Select files directly from your preferred cloud storage service")}
        </p>
        

        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 腾讯云 COS Button */}
          <button
            onClick={() => openProvider('TencentCOS')}
            className="flex flex-col items-center justify-center p-6 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-all group"
          >
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                />
              </svg>
            </div>
            <span className="font-medium text-green-700">{t("Tencent Cloud COS")}</span>
          </button>

          {/* 阿里云 OSS Button */}
          <button
            onClick={() => openProvider('AliyunOSS')}
            className="flex flex-col items-center justify-center p-6 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-all group"
          >
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                />
              </svg>
            </div>
            <span className="font-medium text-orange-700">{t("Alibaba Cloud OSS")}</span>
          </button>

          {/* OneDrive Button */}
          <button
            onClick={() => openProvider('OneDrive')}
            className="flex flex-col items-center justify-center p-6 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-all group"
          >
            <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.4 15.6l-3.6-2.1 3.6-2.1v4.2zm-10.8 0V11.4l3.6 2.1-3.6 2.1zm5.4-1.2l-3.6-2.1 3.6-2.1 3.6 2.1-3.6 2.1z"
                />
              </svg>
            </div>
            <span className="font-medium text-teal-700">{t("OneDrive")}</span>
          </button>
        </div>
      </div>

      {/* 隐藏的触发按钮 */}
      <button className="uppy-Dashboard-open hidden"></button>
      
      {/* Dashboard Modal */}
      {activeProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold">
                {t("Select from {provider}", { provider: activeProvider })}
              </h3>
              <button
                onClick={() => setActiveProvider(null)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="p-4 min-h-[400px]">
              {renderProviderContent(activeProvider)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}