import React, { useState } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { CategoryDropdown } from './CategoryDropdown';


interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

const FileUploadDialog: React.FC<FileUploadDialogProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | undefined>(undefined);
  const { uploadFile, isUploading, error: uploadError } = useFileUpload();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCurrentCategoryId(undefined);
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
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          maxWidth: '425px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: '0' }}>
            Upload New File
          </h2>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="file-upload-input" 
              style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151',
                marginBottom: '8px' 
              }}
            >
              Select File
            </label>
            <input
              id="file-upload-input"
              type="file"
              onChange={handleFileChange}
              style={{
                display: 'block',
                width: '100%',
                fontSize: '14px',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '8px'
              }}
            />
          </div>

          {selectedFile && (
            <div style={{ 
              fontSize: '14px', 
              color: '#6b7280', 
              backgroundColor: '#f9fafb',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '0' }}>
                📁 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151',
              marginBottom: '8px' 
            }}>
              Category (Optional)
            </label>
            <CategoryDropdown 
              selectedCategoryId={currentCategoryId}
              onCategoryChange={setCurrentCategoryId}
              allowClear={true}
            />
          </div>

          {isUploading && (
            <div style={{ 
              textAlign: 'center', 
              fontSize: '14px', 
              color: '#3b82f6',
              marginBottom: '16px' 
            }}>
              ⏳ Uploading...
            </div>
          )}
          
          {uploadError && (
            <div style={{ 
              textAlign: 'center', 
              fontSize: '14px', 
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              ❌ Error: {uploadError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '16px'
        }}>
          <button
            onClick={handleClose}
            disabled={isUploading}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              color: '#374151',
              borderRadius: '6px',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              opacity: isUploading ? 0.6 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              border: 'none',
              backgroundColor: (!selectedFile || isUploading) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              borderRadius: '6px',
              cursor: (!selectedFile || isUploading) ? 'not-allowed' : 'pointer'
            }}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUploadDialog;
