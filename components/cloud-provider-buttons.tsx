"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Uppy from "@uppy/core";
// 注：由于百度网盘和阿里网盘无官方Uppy支持，使用腾讯云COS和阿里云OSS作为替代
// 百度网盘和阿里网盘需要自定义OAuth集成，暂不支持直接替换
import AwsS3 from "@uppy/aws-s3";
import Compressor from "@uppy/compressor";
import OneDrive from "@uppy/onedrive";
import Dashboard from "@uppy/dashboard";
// 暂时注释掉有问题的依赖
// import COS from "cos-js-sdk-v5";
// import OSS from "ali-oss";
// import { cosConfig, allowedFileTypes, uploadConfig } from "@/config/cos.config";
// import { aliyunOSSConfig, aliyunAllowedFileTypes, aliyunUploadConfig } from "@/config/aliyun-oss.config";

interface CloudProviderButtonsProps {
  onFileSelect?: (file: File) => void;
  className?: string;
}

export function CloudProviderButtons({
  onFileSelect,
  className = "",
}: CloudProviderButtonsProps) {
  const t = useTranslations();
  const uppyRef = useRef<Uppy | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  // 腾讯云 COS 相关状态
  const [tencentCOSFiles, setTencentCOSFiles] = useState<Array<{
    name: string;
    size: number;
    modified: Date;
    key: string;
  }>>([]);
  const [selectedTencentCOSFile, setSelectedTencentCOSFile] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{name: string, avatar: string} | null>(null);
  
  // 阿里云 OSS 相关状态
  const [aliyunOSSFiles, setAliyunOSSFiles] = useState<Array<{
    name: string;
    size: number;
    modified: Date;
    key: string;
  }>>([]);
  const [selectedAliyunOSSFile, setSelectedAliyunOSSFile] = useState<string | null>(null);
  const [isAliyunAuthenticated, setIsAliyunAuthenticated] = useState(false);
  const [aliyunUserInfo, setAliyunUserInfo] = useState<{name: string, avatar: string} | null>(null);
  
  // OneDrive 相关状态
  const [oneDriveFiles, setOneDriveFiles] = useState<Array<{
    name: string;
    size: number;
    modified: Date;
    id: string;
  }>>([]);
  const [selectedOneDriveFile, setSelectedOneDriveFile] = useState<string | null>(null);
  
  // 腾讯云 COS 客户端
  // const [cosClient, setCosClient] = useState<any | null>(null);
  
  // 阿里云 OSS 客户端
  // const [ossClient, setOssClient] = useState<any | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 暂时注释掉 COS 和 OSS 初始化
    // 初始化腾讯云 COS 客户端
    /*
    const initCOS = () => {
      try {
        const client = new COS(cosConfig);
        setCosClient(client);
        console.log('腾讯云 COS 客户端初始化成功');
      } catch (error) {
        console.error('腾讯云 COS 客户端初始化失败:', error);
      }
    };
    
    // 初始化阿里云 OSS 客户端
    const initOSS = () => {
      try {
        const client = new OSS(aliyunOSSConfig);
        setOssClient(client);
        console.log('阿里云 OSS 客户端初始化成功');
      } catch (error) {
        console.error('阿里云 OSS 客户端初始化失败:', error);
      }
    };
    
    initCOS();
    initOSS();
    */
    
    // 初始化 Uppy 实例
    const uppy = new Uppy({
      debug: process.env.NODE_ENV === "development",
      autoProceed: false,
    });

    // 添加必要的插件
    uppy.use(Compressor, {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
    });

    // @ts-ignore
    uppy.use(AwsS3, {
      companionUrl: "https://companion.uppy.io",
    });

    uppy.use(OneDrive, {
      companionUrl: "https://companion.uppy.io",
    });

    // @ts-ignore
    uppy.use(Dashboard, {
      trigger: ".uppy-Dashboard-open",
      inline: false,
      width: 750,
      height: 550,
      proudlyDisplayPoweredByUppy: false,
      note: t("Select files from your device"),
      doneButtonHandler: null,
    });

    uppyRef.current = uppy;

    // 文件选择事件处理
    uppy.on("file-added", (file) => {
      console.log("File added:", file);
      if (onFileSelect && file.data instanceof File) {
        onFileSelect(file.data);
      }
    });

    // 清理函数
    return () => {
      if (uppyRef.current) {
        // @ts-ignore
        uppyRef.current.close();
      }
    };
  }, [onFileSelect, t]);

  const openProvider = (provider: string) => {
    setActiveProvider(provider);
    
    // 延迟执行，确保 DOM 更新完成
    setTimeout(() => {
      if (uppyRef.current) {
        try {
          // @ts-ignore
          const existingDashboard = uppyRef.current.getPlugin('Dashboard');
          if (!existingDashboard) {
            console.log("Initializing Dashboard plugin");
            // @ts-ignore
            uppyRef.current.use(Dashboard, {
              trigger: ".uppy-Dashboard-open",
              inline: false,
              width: 750,
              height: 550,
              proudlyDisplayPoweredByUppy: false,
              note: t("Select files from your device"),
              doneButtonHandler: null,
            });
          }
          
          // 触发点击事件
          setTimeout(() => {
            const triggerButton = document.querySelector(".uppy-Dashboard-open") as HTMLElement;
            if (triggerButton) {
              triggerButton.click();
            }
          }, 100);
        } catch (error) {
          console.error(`Error opening ${provider}:`, error);
        }
      }
    }, 100);
  };

  const renderProviderContent = (provider: string) => {
    switch (provider) {
      case 'TencentCOS':
        if (!isAuthenticated) {
          return renderTencentCOSLogin();
        }
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
                {userInfo && (
                  <div className="flex items-center gap-2 ml-auto">
                    <img 
                      src={userInfo.avatar} 
                      alt="用户头像" 
                      className="w-8 h-8 rounded-full"
                      onError={(e) => (e.currentTarget.src = '/default-avatar.png')}
                    />
                    <span className="text-sm">{userInfo.name}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshTencentCOS}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="刷新"
                  disabled={isLoading}
                >
                  <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  </svg>
                </button>
                <button
                  onClick={handleTencentCOSLogout}
                  className="p-2 hover:bg-muted rounded-lg transition-colors text-sm text-red-500"
                  title="退出登录"
                >
                  退出
                </button>
              </div>
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
        if (!isAliyunAuthenticated) {
          return renderAliyunOSSLogin();
        }
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
                {aliyunUserInfo && (
                  <div className="flex items-center gap-2 ml-auto">
                    <img 
                      src={aliyunUserInfo.avatar} 
                      alt="用户头像" 
                      className="w-8 h-8 rounded-full"
                      onError={(e) => (e.currentTarget.src = '/default-avatar.png')}
                    />
                    <span className="text-sm">{aliyunUserInfo.name}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAliyunOSSRefresh}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="刷新"
                  disabled={isLoading}
                >
                  <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  </svg>
                </button>
                <button
                  onClick={handleAliyunOSSLogout}
                  className="p-2 hover:bg-muted rounded-lg transition-colors text-sm text-red-500"
                  title="退出登录"
                >
                  退出
                </button>
              </div>
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

  // 腾讯云 COS 登录相关函数
  const renderTencentCOSLogin = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-bold mb-2">腾讯云 COS</h3>
        <p className="text-text-secondary mb-8 max-w-md">
          请登录您的腾讯云账号以访问 COS 对象存储服务中的文件
        </p>
        
        <div className="bg-muted/50 rounded-xl p-6 w-full max-w-md mb-6">
          <h4 className="font-semibold mb-4 text-left">登录方式</h4>
          <div className="space-y-3">
            <button
              onClick={handleTencentCOSLogin}
              className="w-full flex items-center gap-3 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <span className="font-medium">使用腾讯云账号登录</span>
            </button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-text-secondary">或</span>
              </div>
            </div>
            
            <button
              onClick={handleTencentCOSDemoLogin}
              className="w-full p-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
            >
              演示模式（查看示例文件）
            </button>
          </div>
        </div>
        
        <div className="text-sm text-text-secondary max-w-md">
          <p className="mb-2">🔒 安全提示：</p>
          <ul className="text-left space-y-1 text-xs">
            <li>• 我们不会保存您的账号密码</li>
            <li>• 使用 OAuth 2.0 安全授权</li>
            <li>• 仅获取必要的文件访问权限</li>
          </ul>
        </div>
      </div>
    );
  };

  const handleTencentCOSLogin = () => {
    console.log('开始腾讯云 COS 登录流程');
    alert('实际应用中会跳转到腾讯云 OAuth 授权页面');
  };

  const handleTencentCOSDemoLogin = () => {
    setIsAuthenticated(true);
    setUserInfo({
      name: '演示用户',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=演示用户'
    });
    
    setTencentCOSFiles([
      { name: '项目计划书.docx', size: 2048000, modified: new Date(Date.now() - 86400000), key: 'documents/项目计划书.docx' },
      { name: '销售数据.xlsx', size: 3072000, modified: new Date(Date.now() - 172800000), key: 'data/销售数据.xlsx' },
      { name: '产品介绍.pptx', size: 1536000, modified: new Date(Date.now() - 259200000), key: 'presentations/产品介绍.pptx' },
      { name: '合同模板.pdf', size: 1024000, modified: new Date(Date.now() - 345600000), key: 'templates/合同模板.pdf' },
    ]);
    
    console.log('演示登录成功');
  };

  const handleTencentCOSLogout = () => {
    setIsAuthenticated(false);
    setUserInfo(null);
    setTencentCOSFiles([]);
    setSelectedTencentCOSFile(null);
    console.log('已退出腾讯云 COS');
  };

  const refreshTencentCOS = () => {
    console.log('刷新腾讯云 COS 文件列表');
    // 这里可以添加真实的刷新逻辑
  };

  const handleTencentCOSUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('上传文件到腾讯云 COS:', file.name);
        alert(`文件 ${file.name} 已选择`);
      }
    };
    input.click();
  };

  const handleTencentCOSDownload = () => {
    if (selectedTencentCOSFile) {
      console.log('下载文件 from 腾讯云 COS:', selectedTencentCOSFile);
      alert(`正在下载文件: ${selectedTencentCOSFile}`);
    }
  };

  const handleTencentCOSSelect = (fileName: string) => {
    setSelectedTencentCOSFile(selectedTencentCOSFile === fileName ? null : fileName);
  };

  const renderTencentCOSFileList = () => {
    if (tencentCOSFiles.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <svg className="w-16 h-16 text-text-secondary mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-text-secondary mb-2">暂无文件</p>
          <p className="text-sm text-text-tertiary">点击上传按钮添加文件</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {tencentCOSFiles.map((file) => (
          <div
            key={file.key}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedTencentCOSFile === file.name
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted'
            }`}
            onClick={() => handleTencentCOSSelect(file.name)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {file.name.endsWith('.docx') || file.name.endsWith('.doc') ? (
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                ) : file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? (
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                ) : file.name.endsWith('.pptx') || file.name.endsWith('.ppt') ? (
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-text-secondary">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • {file.modified.toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTencentCOSDownload();
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-text-secondary hover:text-primary"
                title="下载"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 阿里云 OSS 登录相关函数
  const renderAliyunOSSLogin = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-bold mb-2">阿里云 OSS</h3>
        <p className="text-text-secondary mb-8 max-w-md">
          请登录您的阿里云账号以访问 OSS 对象存储服务中的文件
        </p>
        
        <div className="bg-muted/50 rounded-xl p-6 w-full max-w-md mb-6">
          <h4 className="font-semibold mb-4 text-left">登录方式</h4>
          <div className="space-y-3">
            <button
              onClick={handleAliyunOSSLogin}
              className="w-full flex items-center gap-3 p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.4 15.6l-3.6-2.1 3.6-2.1v4.2zm-10.8 0V11.4l3.6 2.1-3.6 2.1zm5.4-1.2l-3.6-2.1 3.6-2.1 3.6 2.1-3.6 2.1z"/>
                </svg>
              </div>
              <span className="font-medium">使用阿里云账号登录</span>
            </button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-text-secondary">或</span>
              </div>
            </div>
            
            <button
              onClick={handleAliyunOSSDemoLogin}
              className="w-full p-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
            >
              演示模式（查看示例文件）
            </button>
          </div>
        </div>
        
        <div className="text-sm text-text-secondary max-w-md">
          <p className="mb-2">🔒 安全提示：</p>
          <ul className="text-left space-y-1 text-xs">
            <li>• 我们不会保存您的账号密码</li>
            <li>• 使用 OAuth 2.0 安全授权</li>
            <li>• 仅获取必要的文件访问权限</li>
          </ul>
        </div>
      </div>
    );
  };

  const handleAliyunOSSLogin = () => {
    console.log('开始阿里云 OSS 登录流程');
    alert('实际应用中会跳转到阿里云 OAuth 授权页面');
  };

  const handleAliyunOSSDemoLogin = async () => {
    setIsAliyunAuthenticated(true);
    setAliyunUserInfo({
      name: '阿里云用户',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=阿里云用户'
    });
    
    // 直接使用示例文件
    setAliyunOSSFiles([
      { name: '数据分析报告.xlsx', size: 4096000, modified: new Date(Date.now() - 86400000), key: 'reports/数据分析报告.xlsx' },
      { name: '市场调研.pptx', size: 2048000, modified: new Date(Date.now() - 172800000), key: 'presentations/市场调研.pptx' },
      { name: '技术文档.docx', size: 1536000, modified: new Date(Date.now() - 259200000), key: 'docs/技术文档.docx' },
      { name: '用户手册.pdf', size: 3072000, modified: new Date(Date.now() - 345600000), key: 'manuals/用户手册.pdf' },
    ]);
    console.log('阿里云使用示例文件');
  };

  const handleAliyunOSSLogout = () => {
    setIsAliyunAuthenticated(false);
    setAliyunUserInfo(null);
    setAliyunOSSFiles([]);
    setSelectedAliyunOSSFile(null);
    console.log('已退出阿里云 OSS');
  };

  const handleAliyunOSSUpload = async () => {
    /*
    if (!ossClient) {
      alert('OSS 客户端未初始化');
      return;
    }
    */
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          setIsLoading(true);
          console.log('开始上传文件到阿里云 OSS:', file.name);
          
          // 模拟上传文件到 OSS
          console.log(`模拟上传文件: ${file.name}`);
          const result = { url: `https://oss.example.com/uploads/${file.name}` };
          
          console.log('文件上传成功:', result);
          alert(`文件 ${file.name} 上传成功！`);
          
          // 刷新文件列表
          await handleAliyunOSSDemoLogin();
          
        } catch (error) {
          console.error('文件上传失败:', error);
          alert(`文件上传失败: ${(error as Error).message}`);
        } finally {
          setIsLoading(false);
        }
      }
    };
    input.click();
  };

  const handleAliyunOSSDownload = async () => {
    /*
    if (!ossClient || !selectedAliyunOSSFile) {
      alert('请选择要下载的文件');
      return;
    }
    */
    
    try {
      setIsLoading(true);
      console.log('开始下载文件:', selectedAliyunOSSFile);
      
      // 找到选中的文件信息
      const selectedFile = aliyunOSSFiles.find(f => f.name === selectedAliyunOSSFile);
      if (!selectedFile) {
        throw new Error('未找到选中的文件');
      }
      
      // 模拟生成临时下载链接
      const url = `https://oss.example.com/${selectedFile.key}?temp-access-token=xxx`;
      
      // 创建临时链接并触发下载
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('文件下载完成:', selectedFile.name);
      alert(`文件 ${selectedFile.name} 开始下载`);
      
    } catch (error) {
      console.error('文件下载失败:', error);
      alert(`文件下载失败: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAliyunOSSRefresh = async () => {
    await handleAliyunOSSDemoLogin();
  };

  const handleAliyunOSSDelete = async (fileName: string) => {
    /*
    if (!ossClient) {
      alert('OSS 客户端未初始化');
      return;
    }
    */
    
    if (!confirm(`确定要删除文件 "${fileName}" 吗？`)) {
      return;
    }
    
    try {
      setIsLoading(true);
      const file = aliyunOSSFiles.find(f => f.name === fileName);
      if (file) {
        // 模拟删除文件
        console.log(`模拟删除文件: ${file.key}`);
        console.log('文件删除成功:', fileName);
        alert(`文件 ${fileName} 删除成功`);
        
        // 刷新文件列表
        await handleAliyunOSSDemoLogin();
      }
    } catch (error) {
      console.error('文件删除失败:', error);
      alert(`文件删除失败: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAliyunOSSSelect = (fileName: string) => {
    setSelectedAliyunOSSFile(selectedAliyunOSSFile === fileName ? null : fileName);
  };

  const renderAliyunOSSFileList = () => {
    if (aliyunOSSFiles.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <svg className="w-16 h-16 text-text-secondary mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-text-secondary mb-2">暂无文件</p>
          <p className="text-sm text-text-tertiary">点击上传按钮添加文件</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {aliyunOSSFiles.map((file) => (
          <div
            key={file.key}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedAliyunOSSFile === file.name
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted'
            }`}
            onClick={() => handleAliyunOSSSelect(file.name)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {file.name.endsWith('.docx') || file.name.endsWith('.doc') ? (
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                ) : file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? (
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                ) : file.name.endsWith('.pptx') || file.name.endsWith('.ppt') ? (
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-text-secondary">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • {file.modified.toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAliyunOSSDownload();
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-text-secondary hover:text-primary"
                title="下载"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAliyunOSSDelete(file.name);
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-text-secondary hover:text-red-500"
                title="删除"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // OneDrive 相关函数
  const refreshOneDrive = () => {
    console.log('刷新 OneDrive 文件列表');
    setOneDriveFiles([
      { name: 'budget.xlsx', size: 1280000, modified: new Date(), id: '1' },
      { name: 'presentation.pptx', size: 2560000, modified: new Date(), id: '2' },
    ]);
  };

  const handleOneDriveUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('上传文件到 OneDrive:', file.name);
        alert(`文件 ${file.name} 已选择`);
      }
    };
    input.click();
  };

  const handleOneDriveDownload = () => {
    if (selectedOneDriveFile) {
      console.log('下载文件 from OneDrive:', selectedOneDriveFile);
      alert(`正在下载文件: ${selectedOneDriveFile}`);
    }
  };

  const handleOneDriveSelect = (fileName: string) => {
    setSelectedOneDriveFile(selectedOneDriveFile === fileName ? null : fileName);
  };

  const renderOneDriveFileList = () => {
    if (oneDriveFiles.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <svg className="w-16 h-16 text-text-secondary mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-text-secondary mb-2">暂无文件</p>
          <p className="text-sm text-text-tertiary">点击上传按钮添加文件</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {oneDriveFiles.map((file) => (
          <div
            key={file.id}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedOneDriveFile === file.name
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted'
            }`}
            onClick={() => handleOneDriveSelect(file.name)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {file.name.endsWith('.docx') || file.name.endsWith('.doc') ? (
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                ) : file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? (
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                ) : file.name.endsWith('.pptx') || file.name.endsWith('.ppt') ? (
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-text-secondary">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • {file.modified.toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOneDriveDownload();
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-text-secondary hover:text-primary"
                title="下载"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
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