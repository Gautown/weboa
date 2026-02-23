"use client";

import { useState } from "react";
import { X, Cloud } from "lucide-react";
import { useExtracted } from "next-intl";
import { CloudStorageUppy } from "@/components/cloud-storage-uppy";

interface CloudStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect?: (file: File) => void;
  onFileSelectWithHandle?: (file: File, handle?: FileSystemFileHandle) => void;
}

export function CloudStorageModal({
  isOpen,
  onClose,
  onFileSelect,
  onFileSelectWithHandle,
}: CloudStorageModalProps) {
  const t = useExtracted();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {t("Cloud Storage Integration")}
              </h2>
              <p className="text-sm text-text-secondary">
                {t("Select files from your cloud storage services")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <CloudStorageUppy
            onFileSelect={onFileSelect}
            onFileSelectWithHandle={onFileSelectWithHandle}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-foreground transition-colors"
          >
            {t("Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}