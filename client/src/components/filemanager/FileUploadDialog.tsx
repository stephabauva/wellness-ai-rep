import React, { useState } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { CategoryDropdown } from './CategoryDropdown';
import { Button } from '@shared/components/ui/button';
import { Skeleton } from '@shared/components/ui/skeleton';
import { Upload, FileImage, AlertCircle, X, Camera } from 'lucide-react';
import { cn } from '@shared';
import CameraCapture from './CameraCapture';


interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

const FileUploadDialog: React.FC<FileUploadDialogProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'file' | 'camera'>('file');
  const { uploadFile, isUploading, error: uploadError } = useFileUpload();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    setActiveTab('file');
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCurrentCategoryId(undefined);
    setActiveTab('file');
    onClose();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }
    
    const result = await uploadFile(selectedFile, currentCategoryId);
    
    if (result && !uploadError) {
      onUploadSuccess();
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className={cn(
          "relative w-full max-w-md mx-4 rounded-2xl border-0",
          "bg-white dark:bg-gray-800 shadow-2xl",
          "transform-gpu will-change-transform",
          "animate-in fade-in-0 zoom-in-95 duration-300"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className={cn(
            "absolute right-4 top-4 rounded-full p-2",
            "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
            {activeTab === 'camera' ? (
              <Camera className="h-6 w-6 text-white" />
            ) : (
              <Upload className="h-6 w-6 text-white" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-center text-gray-900 dark:text-white">
            {activeTab === 'camera' ? 'Take Photo' : 'Upload New File'}
          </h2>
          
          {/* Tab Navigation */}
          <div className="flex mt-4 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <button
              onClick={() => setActiveTab('file')}
              className={cn(
                "flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === 'file'
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Upload className="h-4 w-4 mr-2" />
              File
            </button>
            <button
              onClick={() => setActiveTab('camera')}
              className={cn(
                "flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === 'camera'
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Camera className="h-4 w-4 mr-2" />
              Camera
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 space-y-6">
          {activeTab === 'camera' ? (
            <CameraCapture
              onCapture={handleCameraCapture}
              onClose={() => setActiveTab('file')}
            />
          ) : (
            <>
              {/* File Input Section */}
              <div className="space-y-3">
                <label 
                  htmlFor="file-upload-input" 
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Select File
                </label>
                <div className="relative">
                  <input
                    id="file-upload-input"
                    type="file"
                    onChange={handleFileChange}
                    className={cn(
                      "block w-full text-sm text-gray-500 dark:text-gray-400",
                      "file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0",
                      "file:text-sm file:font-medium",
                      "file:bg-gradient-to-r file:from-blue-50 file:to-purple-50",
                      "file:text-blue-600 dark:file:bg-gradient-to-r dark:file:from-blue-900/20 dark:file:to-purple-900/20",
                      "dark:file:text-blue-400",
                      "hover:file:from-blue-100 hover:file:to-purple-100",
                      "file:transition-all file:duration-300 file:cursor-pointer",
                      "border border-gray-200 dark:border-gray-600 rounded-xl",
                      "bg-white dark:bg-gray-700",
                      "transition-colors duration-300",
                      "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    )}
                  />
                </div>
              </div>
              {/* Selected File Preview */}
              {selectedFile && (
                <div className="flex items-center p-4 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border border-gray-200 dark:border-gray-600">
                  <FileImage className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              )}

              {/* Category Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category (Optional)
                </label>
                <CategoryDropdown 
                  selectedCategoryId={currentCategoryId}
                  onCategoryChange={setCurrentCategoryId}
                  allowClear={true}
                />
              </div>
            </>
          )}

          {/* Loading State */}
          {isUploading && (
            <div className="space-y-3">
              <div className="flex items-center justify-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Uploading your file...
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-2 w-3/4 rounded-full" />
              </div>
            </div>
          )}
          
          {/* Error State */}
          {uploadError && (
            <div className="flex items-start p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300">Upload Failed</h4>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{uploadError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(activeTab === 'file' && selectedFile) || isUploading ? (
          <div className="flex flex-col sm:flex-row gap-3 p-6 pt-6">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
              className={cn(
                "flex-1 sm:flex-none rounded-xl border-gray-200 dark:border-gray-600",
                "transition-all duration-300 ease-out",
                "hover:scale-105 hover:shadow-lg active:scale-95",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className={cn(
                "flex-1 sm:flex-none rounded-xl",
                "bg-gradient-to-r from-blue-500 to-purple-600",
                "hover:from-blue-600 hover:to-purple-700",
                "transition-all duration-300 ease-out",
                "transform-gpu will-change-transform",
                "hover:scale-105 hover:shadow-lg active:scale-95",
                "disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed",
                "disabled:hover:scale-100 disabled:hover:shadow-none"
              )}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload File"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default FileUploadDialog;
