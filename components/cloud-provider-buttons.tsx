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
    
    // 延迟添加 dashboard 插件以确保 DOM 已准备就绪
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
        
        {/* 说明信息 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</div>
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                {t("Cloud Storage Notice")}
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t("Recommended to use local file selection as cloud storage services are being improved")}
              </p>
            </div>
          </div>
        </div>
        
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
            <span className="font-medium text-teal-700">OneDrive</span>
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
              <div id="uppy-dashboard-container"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}