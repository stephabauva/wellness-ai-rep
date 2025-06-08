import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Trash2, 
  Download, 
  FileText, 
  Image, 
  Activity, 
  Stethoscope,
  CheckSquare,
  Square,
  RotateCcw,
  Share2,
  QrCode,
  X,
  Grid3X3,
  List
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Upload,
  Share
} from 'lucide-react';

interface FileItem {
  id: string;
  fileName: string;
  displayName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  retentionInfo: {
    category: 'high' | 'medium' | 'low';
    retentionDays: number;
    reason: string;
  };
  url?: string;
}

interface FileCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  files: FileItem[];
  description: string;
}

interface FileManagerSectionProps {
  selectionMode?: boolean;
  onFileSelect?: (files: any[]) => void;
}

const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case 'image/jpeg':
    case 'image/png':
      return <Image className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileManagerSection: React.FC<FileManagerSectionProps> = ({ selectionMode = false, onFileSelect }) => {
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadFiles = async () => {
      setIsLoading(true);
      try {
        // Simulate loading files from a server or storage
        const loadedFiles = [
          { name: 'Document 1.pdf', size: 2048, type: 'application/pdf', lastModified: Date.now() },
          { name: 'Image 1.jpg', size: 4096, type: 'image/jpeg', lastModified: Date.now() },
          { name: 'Spreadsheet 1.xlsx', size: 3072, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', lastModified: Date.now() },
        ];
        setFiles(loadedFiles);
      } catch (error) {
        console.error("Failed to load files", error);
        toast({
          title: "Error",
          description: "Failed to load files. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, []);

  const handleFileSelection = (fileName: string) => {
    if (!selectionMode) return;

    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  };

  const handleConfirmSelection = () => {
    if (onFileSelect && selectedFiles.size > 0) {
      const selected = files.filter(file => selectedFiles.has(file.name));
      onFileSelect(selected);
    }
  };

  const handleDownload = async (fileName: string) => {
    toast({
      description: `Downloading ${fileName}...`,
    });
    // Simulate a download
    setTimeout(() => {
      toast({
        title: "Download Complete",
        description: `${fileName} has been downloaded.`,
      });
    }, 1000);
  };

  const handleUpload = () => {
    toast({
      description: "Simulating file upload...",
    });
    // Simulate an upload
    setTimeout(() => {
      toast({
        title: "Upload Complete",
        description: "All files have been uploaded.",
      });
    }, 1000);
  };

  const handleShare = async (filesToShare: any[]) => {
    if (filesToShare && filesToShare.length > 0) {
      toast({
        description: `Sharing ${filesToShare.map(file => file.name).join(', ')}...`,
      });
      // Simulate sharing
      setTimeout(() => {
        toast({
          title: "Share Complete",
          description: `Files ${filesToShare.map(file => file.name).join(', ')} have been shared.`,
        });
      }, 1000);
    }
  };

  const handleDelete = async (fileName: string) => {
    setFiles(prevFiles => prevFiles.filter(file =>file.name !== fileName));
    toast({
      description: `Deleting ${fileName}...`,
    });
    // Simulate deletion
    setTimeout(() => {
      toast({
        title: "Deletion Complete",
        description: `${fileName} has been deleted.`,
      });
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <RotateCcw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-4 md:p-6 border-b">
        <div className="space-y-4">
          
<div className="flex items-center gap-4 mb-4">
            <h2 className="text-2xl font-semibold">
              {selectionMode ? "Select Files" : "File Manager"}
            </h2>
            {selectionMode ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedFiles.size} selected
                </span>
                <Button 
                  onClick={handleConfirmSelection}
                  size="sm"
                  disabled={selectedFiles.size === 0}
                >
                  Select Files ({selectedFiles.size})
                </Button>
              </div>
            ) : (
              <Button onClick={handleUpload} size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-auto">
        
          

          
            
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map(file => (
            <div 
              key={file.name} 
              className={`border rounded-lg p-4 ${
                selectionMode ? 'cursor-pointer hover:bg-accent' : ''
              } ${
                selectedFiles.has(file.name) ? 'bg-accent border-primary' : ''
              }`}
              onClick={() => selectionMode && handleFileSelection(file.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectionMode && (
                    <input 
                      type="checkbox" 
                      checked={selectedFiles.has(file.name)}
                      onChange={() => handleFileSelection(file.name)}
                      className="rounded"
                    />
                  )}
                  {getFileIcon(file.type)}
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} • {format(new Date(file.lastModified), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                {!selectionMode && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file.name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare([file])}
                    >
                      <Share className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(file.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FileManagerSection;