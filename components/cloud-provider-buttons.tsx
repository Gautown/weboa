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
import COS from "cos-js-sdk-v5";
import OSS from "ali-oss";
import { cosConfig, allowedFileTypes, uploadConfig } from "@/config/cos.config";
import { aliyunOSSConfig, aliyunAllowedFileTypes, aliyunUploadConfig } from "@/config/aliyun-oss.config";

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
  }>>([]);
  const [selectedTencentCOSFile, setSelectedTencentCOSFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
  }>>([
    { name: 'meeting-notes.docx', size: 256000, modified: new Date(), id: '1' },
    { name: 'budget.xlsx', size: 1280000, modified: new Date(), id: '2' },
  ]);
  const [selectedOneDriveFile, setSelectedOneDriveFile] = useState<string | null>(null);
  
  // 腾讯云 COS 客户端
  const [cosClient, setCosClient] = useState<COS | null>(null);
  
  // 阿里云 OSS 客户端
  const [ossClient, setOssClient] = useState<OSS | null>(null);
  
  // 使用导入的配置

  useEffect(() => {
    // 初始化腾讯云 COS 客户端
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
  const refreshTencentCOS = async () => {
    if (!cosClient) {
      console.error('COS 客户端未初始化');
      return;
    }
    
    setIsLoading(true);
    try {
      // 获取文件列表
      // 注意：需要替换为您的实际 Bucket 和 Region
      const result = await new Promise((resolve, reject) => {
        cosClient.getBucket({
          Bucket: cosConfig.bucket,
          Region: cosConfig.region,
          Prefix: '',                 // 文件前缀，可为空
        }, (err: any, data: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
      
      console.log('腾讯云 COS 文件列表:', result);
      
      // 处理返回的文件数据
      // @ts-ignore
      const files = result.Contents?.map((item: any) => ({
        name: item.Key.split('/').pop() || item.Key,
        size: parseInt(item.Size),
        modified: new Date(item.LastModified),
        key: item.Key
      })) || [];
      
      setTencentCOSFiles(files);
      
    } catch (error) {
      console.error('获取腾讯云 COS 文件列表失败:', error);
      alert('获取文件列表失败，请检查配置');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTencentCOSUpload = () => {
    if (!cosClient) {
      alert('COS 客户端未初始化');
      return;
    }
    
    // 触发文件选择
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          setIsLoading(true);
          console.log('开始上传文件到腾讯云 COS:', file.name);
          
          // 上传文件到 COS
          await new Promise((resolve, reject) => {
            cosClient.putObject({
              Bucket: cosConfig.bucket,
              Region: cosConfig.region,
              Key: `uploads/${file.name}`, // 上传路径
              Body: file,
              onProgress: function(progressData: any) {
                console.log('上传进度:', Math.round(progressData.percent * 100) + '%');
              }
            }, (err: any, data: any) => {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            });
          });
          
          console.log('文件上传成功:', file.name);
          alert(`文件 ${file.name} 上传成功！`);
          
          // 刷新文件列表
          await refreshTencentCOS();
          
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
    // 实际的登录逻辑应该跳转到腾讯云 OAuth 授权页面
    console.log('开始腾讯云 COS 登录流程');
    alert('实际应用中会跳转到腾讯云 OAuth 授权页面');
    
    // 模拟登录成功
    // handleTencentCOSDemoLogin();
  };

  const handleTencentCOSDemoLogin = () => {
    // 演示模式 - 使用示例文件
    setIsAuthenticated(true);
    setUserInfo({
      name: '演示用户',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=演示用户'
    });
    
    // 设置示例文件
    setTencentCOSFiles([
      { name: '项目计划书.docx', size: 2048000, modified: new Date(Date.now() - 86400000), key: 'documents/项目计划书.docx' },
      { name: '销售数据.xlsx', size: 3072000, modified: new Date(Date.now() - 172800000), key: 'data/销售数据.xlsx' },
      { name: '产品介绍.pptx', size: 1536000, modified: new Date(Date.now() - 259200000), key: 'presentations/产品介绍.pptx' },
      { name: '合同模板.pdf', size: 1024000, modified: new Date(Date.now() - 345600000), key: 'templates/合同模板.pdf' },
      { name: '会议纪要.docx', size: 512000, modified: new Date(Date.now() - 432000000), key: 'meetings/会议纪要.docx' },
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

  const handleTencentCOSDownload = async () => {
    if (!cosClient || !selectedTencentCOSFile) {
      alert('请选择要下载的文件');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('开始下载文件:', selectedTencentCOSFile);
      
      // 找到选中的文件信息
      const selectedFile = tencentCOSFiles.find(f => f.name === selectedTencentCOSFile);
      if (!selectedFile) {
        throw new Error('未找到选中的文件');
      }
      
      // 获取文件的临时下载链接
      const url = cosClient.getObjectUrl({
        Bucket: cosConfig.bucket,
        Region: cosConfig.region,
        Key: selectedFile.key,
        Sign: true,
      }, function(err: any, data: any) {
        if (err) {
          throw err;
        }
        return data.Url;
      });
      
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
    
    try {
      if (ossClient) {
        // 获取真实的文件列表
        const result = await ossClient.list({
          'max-keys': 100,
          prefix: ''
        });
        
        console.log('阿里云 OSS 文件列表:', result);
        
        // 处理返回的文件数据
        const files = result.objects?.map((obj: any) => ({
          name: obj.name.split('/').pop() || obj.name,
          size: obj.size,
          modified: new Date(obj.lastModified),
          key: obj.name
        })) || [];
        
        setAliyunOSSFiles(files);
        console.log('阿里云真实文件加载成功');
      } else {
        // 如果客户端未初始化，使用示例文件
        setAliyunOSSFiles([
          { name: '数据分析报告.xlsx', size: 4096000, modified: new Date(Date.now() - 86400000), key: 'reports/数据分析报告.xlsx' },
          { name: '市场调研.pptx', size: 2048000, modified: new Date(Date.now() - 172800000), key: 'presentations/市场调研.pptx' },
          { name: '技术文档.docx', size: 1536000, modified: new Date(Date.now() - 259200000), key: 'docs/技术文档.docx' },
          { name: '用户手册.pdf', size: 3072000, modified: new Date(Date.now() - 345600000), key: 'manuals/用户手册.pdf' },
        ]);
        console.log('阿里云使用示例文件');
      }
    } catch (error) {
      console.error('获取阿里云 OSS 文件列表失败:', error);
      // 出错时使用示例文件
      setAliyunOSSFiles([
        { name: '数据分析报告.xlsx', size: 4096000, modified: new Date(Date.now() - 86400000), key: 'reports/数据分析报告.xlsx' },
        { name: '市场调研.pptx', size: 2048000, modified: new Date(Date.now() - 172800000), key: 'presentations/市场调研.pptx' },
        { name: '技术文档.docx', size: 1536000, modified: new Date(Date.now() - 259200000), key: 'docs/技术文档.docx' },
        { name: '用户手册.pdf', size: 3072000, modified: new Date(Date.now() - 345600000), key: 'manuals/用户手册.pdf' },
      ]);
    }
  };

  const handleAliyunOSSLogout = () => {
    setIsAliyunAuthenticated(false);
    setAliyunUserInfo(null);
    setAliyunOSSFiles([]);
    setSelectedAliyunOSSFile(null);
    console.log('已退出阿里云 OSS');
  };

  const handleAliyunOSSUpload = async () => {
    if (!ossClient) {
      alert('OSS 客户端未初始化');
      return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = aliyunAllowedFileTypes.join(',');
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          setIsLoading(true);
          console.log('开始上传文件到阿里云 OSS:', file.name);
          
          // 上传文件到 OSS
          const result = await ossClient.put(`uploads/${file.name}`, file, {
            headers: {
              'Content-Type': file.type || 'application/octet-stream'
            }
          });
          
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
    if (!ossClient || !selectedAliyunOSSFile) {
      alert('请选择要下载的文件');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('开始下载文件:', selectedAliyunOSSFile);
      
      // 找到选中的文件信息
      const selectedFile = aliyunOSSFiles.find(f => f.name === selectedAliyunOSSFile);
      if (!selectedFile) {
        throw new Error('未找到选中的文件');
      }
      
      // 生成临时下载链接
      const url = ossClient.signatureUrl(selectedFile.key, {
        method: 'GET',
        expires: 3600 // 1小时有效期
      });
      
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
    if (!ossClient) {
      alert('OSS 客户端未初始化');
      return;
    }
    
    if (!confirm(`确定要删除文件 "${fileName}" 吗？`)) {
      return;
    }
    
    try {
      setIsLoading(true);
      const file = aliyunOSSFiles.find(f => f.name === fileName);
      if (file) {
        await ossClient.delete(file.key);
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

  const handleAliyunOSSDownload = () => {
    if (selectedAliyunOSSFile) {
      console.log('Downloading file from Aliyun OSS:', selectedAliyunOSSFile);
      alert(`正在下载文件: ${selectedAliyunOSSFile}`);
    }
  };

  const handleAliyunOSSSelect = (fileName: string) => {
    setSelectedAliyunOSSFile(selectedAliyunOSSFile === fileName ? null : fileName);
  };

  // OneDrive 登录相关函数
  const renderOneDriveLogin = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.4 15.6l-3.6-2.1 3.6-2.1v4.2zm-10.8 0V11.4l3.6 2.1-3.6 2.1zm5.4-1.2l-3.6-2.1 3.6-2.1 3.6 2.1-3.6 2.1z"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-bold mb-2">OneDrive</h3>
        <p className="text-text-secondary mb-8 max-w-md">
          请登录您的 Microsoft 账号以访问 OneDrive 云存储中的文件
        </p>
        
        <div className="bg-muted/50 rounded-xl p-6 w-full max-w-md mb-6">
          <h4 className="font-semibold mb-4 text-left">登录方式</h4>
          <div className="space-y-3">
            <button
              onClick={handleOneDriveLogin}
              className="w-full flex items-center gap-3 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.4 15.6l-3.6-2.1 3.6-2.1v4.2zm-10.8 0V11.4l3.6 2.1-3.6 2.1zm5.4-1.2l-3.6-2.1 3.6-2.1 3.6 2.1-3.6 2.1z"/>
                </svg>
              </div>
              <span className="font-medium">使用 Microsoft 账号登录</span>
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
              onClick={handleOneDriveDemoLogin}
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

  const handleOneDriveLogin = () => {
    console.log('开始 OneDrive 登录流程');
    alert('实际应用中会跳转到 Microsoft OAuth 授权页面');
  };

  const handleOneDriveDemoLogin = () => {
    setIsAuthenticated(true); // 复用腾讯云的状态
    setUserInfo({
      name: 'OneDrive 用户',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=OneDrive用户'
    });
    
    setOneDriveFiles([
      { name: '工作笔记.docx', size: 1024000, modified: new Date(Date.now() - 86400000), id: '1' },
      { name: '财务报表.xlsx', size: 3584000, modified: new Date(Date.now() - 172800000), id: '2' },
      { name: '项目提案.pptx', size: 2560000, modified: new Date(Date.now() - 259200000), id: '3' },
      { name: '培训材料.pdf', size: 2048000, modified: new Date(Date.now() - 345600000), id: '4' },
    ]);
    
    console.log('OneDrive 演示登录成功');
  };

  const handleOneDriveLogout = () => {
    setIsAuthenticated(false);
    setUserInfo(null);
    setOneDriveFiles([]);
    setSelectedOneDriveFile(null);
    console.log('已退出 OneDrive');
  };

  const handleOneDriveSelect = (fileName: string) => {
    setSelectedOneDriveFile(selectedOneDriveFile === fileName ? null : fileName);
  };

  // 渲染文件列表
  const renderTencentCOSFileList = () => {

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
              <button
                onClick={handleTencentCOSLogout}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-sm text-red-500"
                title="退出登录"
              >
                退出
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
        if (!isAuthenticated) { // 复用腾讯云的认证状态
          return renderOneDriveLogin();
        }
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
              <button
                onClick={handleOneDriveLogout}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-sm text-red-500"
                title="退出登录"
              >
                退出
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