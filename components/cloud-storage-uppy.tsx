"use client";

import { useState, useRef, useEffect } from "react";
import { useExtracted } from "next-intl";
import Uppy from "@uppy/core";
import GoogleDrive from "@uppy/google-drive";
import Dropbox from "@uppy/dropbox";
import OneDrive from "@uppy/onedrive";
import Dashboard from "@uppy/dashboard";

interface CloudStorageUppyProps {
  onFileSelect?: (file: File) => void;
  onFileSelectWithHandle?: (file: File, handle?: FileSystemFileHandle) => void;
  className?: string;
}

export function CloudStorageUppy({
  onFileSelect,
  onFileSelectWithHandle,
  className = "",
}: CloudStorageUppyProps) {
  const t = useExtracted();
  const uppyRef = useRef<Uppy | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

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

    // 添加云存储插件
    try {
      uppy.use(GoogleDrive, {
        companionUrl: "https://companion.uppy.io",
        companionCookiesRule: "same-origin",
      });
    } catch (error) {
      console.warn("Failed to initialize Google Drive plugin:", error);
    }

    try {
      uppy.use(Dropbox, {
        companionUrl: "https://companion.uppy.io",
        companionCookiesRule: "same-origin",
      });
    } catch (error) {
      console.warn("Failed to initialize Dropbox plugin:", error);
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
        setShowDashboard(false);
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
      // 显示用户友好的错误消息
      if (error.message && error.message.includes("companion.uppy.io")) {
        console.warn("Companion service unavailable, showing local file picker as fallback");
        // 可以在这里触发本地文件选择作为备选方案
      }
    });

    uppyRef.current = uppy;

    // 清理函数
    return () => {
      if (uppyRef.current) {
        uppyRef.current.cancelAll();
        uppyRef.current.destroy();
      }
    };
  }, [onFileSelect, onFileSelectWithHandle]);

  const [showFallbackPicker, setShowFallbackPicker] = useState(false);

  const openCloudStorage = () => {
    if (uppyRef.current) {
      // 显示 dashboard 模态框
      setShowDashboard(true);
      
      // 延迟添加 dashboard 插件以确保 DOM 已准备就绪
      setTimeout(() => {
        if (uppyRef.current) {
          // @ts-ignore
          const existingDashboard = uppyRef.current.getPlugin('Dashboard');
          if (!existingDashboard) {
            // @ts-ignore
            uppyRef.current.use(Dashboard, {
              id: 'Dashboard',
              trigger: '.uppy-Dashboard-open',
              theme: "auto",
              width: "100%",
              height: 400,
              note: t(
                "Select files from Google Drive, Dropbox, or OneDrive. Supports: DOCX, DOC, XLSX, XLS, PPTX, PPT, PDF"
              ),
              proudlyDisplayPoweredByUppy: false,
              showSelectedFiles: true,
              showRemoveButtonAfterComplete: true,
              doneButtonHandler: null,
            });
          }
          
          // 触发 dashboard 打开
          const openButton = document.querySelector('.uppy-Dashboard-open');
          if (openButton) {
            (openButton as HTMLElement).click();
          }
        }
      }, 100);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-muted/40 dark:bg-white/5 border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">
          {t("Cloud Storage Integration")}
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          {t(
            "Select files from Google Drive, Dropbox, or OneDrive. Supports: DOCX, DOC, XLSX, XLS, PPTX, PPT, PDF"
          )}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={openCloudStorage}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all font-medium shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            {t("Open Cloud Storage")}
          </button>
          
          <button
            onClick={() => setShowFallbackPicker(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all font-medium shadow hover:shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
            {t("Local File Picker")}
          </button>
        </div>
      </div>

      {/* 隐藏的触发按钮 */}
      <button className="uppy-Dashboard-open hidden"></button>
      
      {/* 本地文件选择器模态框 */}
      {showFallbackPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold">{t("Local File Picker")}</h3>
              <button
                onClick={() => setShowFallbackPicker(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="p-6">
              <input
                type="file"
                accept=".docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (onFileSelect) {
                      onFileSelect(file);
                    }
                    setShowFallbackPicker(false);
                  }
                }}
                className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              <p className="text-xs text-text-secondary mt-2">
                {t("Supports: DOCX, DOC, XLSX, XLS, PPTX, PPT, PDF")}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {showDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold">{t("Select from Cloud Storage")}</h3>
              <button
                onClick={() => setShowDashboard(false)}
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