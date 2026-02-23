"use client";

import { useRef, useEffect } from "react";
import { useExtracted } from "next-intl";
import Uppy from "@uppy/core";
import GoogleDrive from "@uppy/google-drive";
import Dropbox from "@uppy/dropbox";
import OneDrive from "@uppy/onedrive";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const uppyRef = useRef<Uppy | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
    uppy.use(GoogleDrive, {
      companionUrl: "https://companion.uppy.io",
      companionCookiesRule: "same-origin",
    });

    uppy.use(Dropbox, {
      companionUrl: "https://companion.uppy.io",
      companionCookiesRule: "same-origin",
    });

    uppy.use(OneDrive, {
      companionUrl: "https://companion.uppy.io",
      companionCookiesRule: "same-origin",
    });

    // 处理文件添加事件
    uppy.on("file-added", (file: any) => {
      console.log("File added:", file);
      if (file.data instanceof File) {
        if (onFileSelectWithHandle) {
          onFileSelectWithHandle(file.data);
        } else if (onFileSelect) {
          onFileSelect(file.data);
        }
      }
    });

    uppy.on("complete", (result) => {
      console.log("Upload complete:", result);
      if (result.successful && result.successful.length > 0) {
        const uploadedFile = result.successful[0];
        console.log("Uploaded file:", uploadedFile);
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Google Drive Button */}
          <button
            onClick={() => {
              if (uppyRef.current) {
                // @ts-ignore
                uppyRef.current.getPlugin("GoogleDrive")?.openModal();
              }
            }}
            className="flex flex-col items-center justify-center p-6 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors group"
          >
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.5 10.5l-1.2-2.1c-.3-.5-.9-.8-1.5-.8H16l-2.1-3.5c-.3-.5-.9-.8-1.5-.8H8.7c-.6 0-1.2.3-1.5.8L5.1 7.5H2.4c-.6 0-1.2.3-1.5.8L.3 10.5c-.3.5-.3 1.1 0 1.6l.6 2.1c.3.5.9.8 1.5.8h3.7l2.1 3.5c.3.5.9.8 1.5.8h3.7c.6 0 1.2-.3 1.5-.8l2.1-3.5h2.7c.6 0 1.2-.3 1.5-.8l.6-2.1c.3-.5.3-1.1 0-1.6zm-15.2 4l-1.9-3.2 1.9-3.2 1.9 3.2-1.9 3.2zm4.4 0l-1.9-3.2 1.9-3.2 1.9 3.2-1.9 3.2zm4.4 0l-1.9-3.2 1.9-3.2 1.9 3.2-1.9 3.2z"
                />
              </svg>
            </div>
            <span className="font-medium text-red-700">Google Drive</span>
          </button>

          {/* Dropbox Button */}
          <button
            onClick={() => {
              if (uppyRef.current) {
                // @ts-ignore
                uppyRef.current.getPlugin("Dropbox")?.openModal();
              }
            }}
            className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors group"
          >
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.4 15.6l-3.6-2.1 3.6-2.1v4.2zm-10.8 0V11.4l3.6 2.1-3.6 2.1zm5.4-1.2l-3.6-2.1 3.6-2.1 3.6 2.1-3.6 2.1z"
                />
              </svg>
            </div>
            <span className="font-medium text-blue-700">Dropbox</span>
          </button>

          {/* OneDrive Button */}
          <button
            onClick={() => {
              if (uppyRef.current) {
                // @ts-ignore
                uppyRef.current.getPlugin("OneDrive")?.openModal();
              }
            }}
            className="flex flex-col items-center justify-center p-6 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors group"
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

      {/* 文件列表显示区域 */}
      <div ref={containerRef} className="hidden" />
    </div>
  );
}