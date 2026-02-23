"use client";

import { useState } from "react";
import { CloudStorageUppy } from "@/components/cloud-storage-uppy";

export default function TestCloudStorage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    console.log("Selected file:", file);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Cloud Storage Integration Test</h1>
        
        <div className="mb-8">
          <CloudStorageUppy onFileSelect={handleFileSelect} />
        </div>

        {selectedFile && (
          <div className="bg-muted/40 dark:bg-white/5 border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Selected File</h2>
            <div className="space-y-2">
              <p><strong>Name:</strong> {selectedFile.name}</p>
              <p><strong>Type:</strong> {selectedFile.type}</p>
              <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>Last Modified:</strong> {new Date(selectedFile.lastModified).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}