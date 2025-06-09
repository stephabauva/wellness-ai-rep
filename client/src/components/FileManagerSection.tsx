
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

const getFileIcon = (fileType: string, fileName: string) => {
  const lowerFileName = fileName.toLowerCase();
  const lowerFileType = fileType.toLowerCase();
  
  if (lowerFileType.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
    return <Image className="h-4 w-4" />;
  }
  
  return <FileText className="h-4 w-4" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const FileManagerSection: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('all');
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all uploaded files
  const { data: files = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/files'],
    queryFn: async () => {
      const response = await fetch('/api/files');
      if (!response.ok) throw new Error('Failed to fetch files');
      return await response.json() as FileItem[];
    }
  });

  // Delete files mutation
  const deleteFilesMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      const response = await fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds })
      });
      if (!response.ok) throw new Error('Failed to delete files');
      return await response.json();
    },
    onSuccess: (data) => {
      setSelectedFiles(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      
      const { deletedCount, actuallyDeleted, notFound, freedSpace } = data;
      let description = `Successfully processed ${deletedCount} file(s)`;
      
      if (actuallyDeleted > 0) {
        description += `, deleted ${actuallyDeleted} file(s) and freed ${formatFileSize(freedSpace)}`;
      }
      
      if (notFound > 0) {
        description += `, ${notFound} file(s) were already removed`;
      }
      
      toast({
        title: "Files processed",
        description,
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete selected files. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Categorize files
  const categorizeFiles = (files: FileItem[]): FileCategory[] => {
    const medical = files.filter(f => 
      f.retentionInfo.category === 'high' || 
      f.fileName.toLowerCase().includes('medical') ||
      f.fileName.toLowerCase().includes('lab') ||
      f.fileName.toLowerCase().includes('prescription')
    );
    
    const fitness = files.filter(f => 
      f.fileName.toLowerCase().includes('workout') ||
      f.fileName.toLowerCase().includes('exercise') ||
      f.fileName.toLowerCase().includes('fitness') ||
      f.fileName.toLowerCase().includes('routine')
    );
    
    const nutrition = files.filter(f => 
      f.fileName.toLowerCase().includes('food') ||
      f.fileName.toLowerCase().includes('meal') ||
      f.fileName.toLowerCase().includes('nutrition') ||
      f.fileType.includes('image') // Assume images are mostly food photos
    );
    
    const other = files.filter(f => 
      !medical.includes(f) && !fitness.includes(f) && !nutrition.includes(f)
    );

    return [
      {
        id: 'medical',
        name: 'Medical',
        icon: <Stethoscope className="h-4 w-4" />,
        files: medical,
        description: 'Medical documents, lab results, prescriptions'
      },
      {
        id: 'fitness',
        name: 'Fitness',
        icon: <Activity className="h-4 w-4" />,
        files: fitness,
        description: 'Exercise routines, workout plans, fitness tracking'
      },
      {
        id: 'nutrition',
        name: 'Nutrition',
        icon: <Image className="h-4 w-4" />,
        files: nutrition,
        description: 'Food photos, meal plans, nutrition information'
      },
      {
        id: 'other',
        name: 'Other',
        icon: <FileText className="h-4 w-4" />,
        files: other,
        description: 'Miscellaneous documents and files'
      }
    ];
  };

  const categories = categorizeFiles(files);
  const activeFiles = activeTab === 'all' ? files : categories.find(c => c.id === activeTab)?.files || [];

  const handleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === activeFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(activeFiles.map(f => f.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedFiles.size === 0) return;
    deleteFilesMutation.mutate(Array.from(selectedFiles));
  };

  const handleWebShare = async () => {
    if (selectedFiles.size === 0) return;
    
    const selectedFileItems = activeFiles.filter(f => selectedFiles.has(f.id));
    
    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        // For multiple files, we'll share download links
        const fileNames = selectedFileItems.map(f => f.displayName).join(', ');
        const downloadLinks = selectedFileItems.map(f => 
          `${window.location.origin}/uploads/${f.fileName}`
        ).join('\n');
        
        await navigator.share({
          title: `Shared Files: ${fileNames}`,
          text: `Download these files:\n${downloadLinks}`,
          url: downloadLinks.split('\n')[0] // First file URL as primary
        });
        
        toast({
          title: "Files shared",
          description: "Files have been shared successfully",
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          toast({
            title: "Sharing failed",
            description: "Could not share files. Try the QR code option.",
            variant: "destructive",
          });
        }
      }
    } else {
      toast({
        title: "Sharing not supported",
        description: "Web Share API not supported. Use QR code instead.",
        variant: "destructive",
      });
    }
  };

  const generateQRCode = () => {
    if (selectedFiles.size === 0) return;
    
    const selectedFileItems = activeFiles.filter(f => selectedFiles.has(f.id));
    const downloadLinks = selectedFileItems.map(f => 
      `${window.location.origin}/uploads/${f.fileName}`
    );
    
    // For single file, use direct link. For multiple files, create a JSON structure
    let qrData: string;
    if (downloadLinks.length === 1) {
      qrData = downloadLinks[0];
    } else {
      qrData = JSON.stringify({
        type: 'multiple_files',
        files: selectedFileItems.map((f, index) => ({
          name: f.displayName,
          url: downloadLinks[index],
          size: f.fileSize
        }))
      });
    }
    
    // Use a QR code generation service (you could also use a local library)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
    setQRCodeData(qrCodeUrl);
    setShowQRCode(true);
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
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">File Manager</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage your uploaded documents and photos
            </p>
          </div>
          
          {/* Mobile: Stack buttons vertically when files are selected */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {selectedFiles.size > 0 && (
              <>
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleWebShare}
                      title="Share via native sharing (AirDrop, Messages, etc.)"
                      className="flex-1 sm:flex-none"
                    >
                      <Share2 className="h-4 w-4 sm:mr-2" />
                      <span className="sm:inline">Share</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={generateQRCode}
                      title="Generate QR code for sharing"
                      className="flex-1 sm:flex-none"
                    >
                      <QrCode className="h-4 w-4 sm:mr-2" />
                      <span className="sm:inline">QR</span>
                    </Button>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={deleteFilesMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedFiles.size}
                  </Button>
                </div>
              </>
            )}
            
            {/* View Mode Toggle */}
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-7 w-7 p-0"
                title="List view"
              >
                <List className="h-3 w-3" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-7 w-7 p-0"
                title="Grid view"
              >
                <Grid3X3 className="h-3 w-3" />
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              className={selectedFiles.size > 0 ? "w-full sm:w-auto" : ""}
            >
              <RotateCcw className="h-4 w-4 sm:mr-2" />
              <span className="sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm p-2 sm:p-3">
              <span className="flex flex-col sm:flex-row items-center gap-1">
                <span className="sm:hidden">All</span>
                <span className="hidden sm:inline">All Files</span>
                <span className="text-xs">({files.length})</span>
              </span>
            </TabsTrigger>
            {categories.map(category => (
              <TabsTrigger key={category.id} value={category.id} className="text-xs sm:text-sm p-2 sm:p-3">
                <span className="flex flex-col sm:flex-row items-center gap-1">
                  {category.icon}
                  <span className="truncate">{category.name}</span>
                  <span className="text-xs">({category.files.length})</span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <FileList 
              files={files}
              selectedFiles={selectedFiles}
              onSelectFile={handleSelectFile}
              onSelectAll={handleSelectAll}
              viewMode={viewMode}
            />
          </TabsContent>

          {categories.map(category => (
            <TabsContent key={category.id} value={category.id} className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    {category.icon}
                    {category.name} Files
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </CardHeader>
              </Card>
              <FileList 
                files={category.files}
                selectedFiles={selectedFiles}
                onSelectFile={handleSelectFile}
                onSelectAll={handleSelectAll}
                viewMode={viewMode}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* QR Code Modal */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Share Files via QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground text-center">
              Scan this QR code with any device to download the selected files
            </div>
            {qrCodeData && (
              <div className="flex justify-center">
                <img 
                  src={qrCodeData} 
                  alt="QR Code for file sharing" 
                  className="border rounded-lg"
                />
              </div>
            )}
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>• Single file: Direct download link</p>
              <p>• Multiple files: JSON data with all download links</p>
              <p>• Files will be downloaded to the device's Downloads folder</p>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setShowQRCode(false)}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface FileListProps {
  files: FileItem[];
  selectedFiles: Set<string>;
  onSelectFile: (fileId: string) => void;
  onSelectAll: () => void;
  viewMode: 'list' | 'grid';
}

const getRetentionBadgeColor = (category: string) => {
  switch (category) {
    case 'high': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const FileList: React.FC<FileListProps> = ({ 
  files, 
  selectedFiles, 
  onSelectFile, 
  onSelectAll,
  viewMode 
}) => {
  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No files found</h3>
          <p className="text-muted-foreground text-center">
            Upload some files through the chat to see them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const allSelected = files.length > 0 && selectedFiles.size === files.length;
  const someSelected = selectedFiles.size > 0 && selectedFiles.size < files.length;

  if (viewMode === 'grid') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onCheckedChange={onSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedFiles.size > 0 ? `${selectedFiles.size} selected` : 'Select all'}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "relative border rounded-lg p-3 transition-colors cursor-pointer",
                  selectedFiles.has(file.id) ? "bg-accent border-primary" : "hover:bg-muted/50"
                )}
                onClick={() => onSelectFile(file.id)}
              >
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedFiles.has(file.id)}
                    onCheckedChange={() => onSelectFile(file.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                <div className="absolute top-2 right-2 z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-background/80"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a 
                      href={`/uploads/${file.fileName}`} 
                      download={file.displayName}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download file"
                    >
                      <Download className="h-3 w-3" />
                    </a>
                  </Button>
                </div>

                <div className="flex flex-col items-center space-y-2 mt-6">
                  {/* File Preview */}
                  <div className="w-16 h-16 flex items-center justify-center bg-muted rounded-lg overflow-hidden">
                    {file.fileType.startsWith('image/') ? (
                      <img
                        src={`/uploads/${file.fileName}`}
                        alt={file.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={cn("flex items-center justify-center w-full h-full", file.fileType.startsWith('image/') ? 'hidden' : '')}>
                      {getFileIcon(file.fileType, file.fileName)}
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="text-center space-y-1 w-full">
                    <h4 className="text-xs font-medium truncate" title={file.displayName}>
                      {file.displayName}
                    </h4>
                    <div className="flex flex-col items-center gap-1">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          getRetentionBadgeColor(file.retentionInfo.category),
                          "text-xs"
                        )}
                      >
                        {file.retentionInfo.category === 'high' ? 'Permanent' : 
                         `${file.retentionInfo.retentionDays}d`}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.fileSize)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // List view (default)
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onCheckedChange={onSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedFiles.size > 0 ? `${selectedFiles.size} selected` : 'Select all'}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-colors",
              selectedFiles.has(file.id) ? "bg-accent" : "hover:bg-muted/50"
            )}
          >
            <Checkbox
              checked={selectedFiles.has(file.id)}
              onCheckedChange={() => onSelectFile(file.id)}
            />
            
            {/* File Preview */}
            <div className="flex-shrink-0 w-10 h-10 bg-muted rounded overflow-hidden flex items-center justify-center">
              {file.fileType.startsWith('image/') ? (
                <img
                  src={`/uploads/${file.fileName}`}
                  alt={file.displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={cn("flex items-center justify-center w-full h-full", file.fileType.startsWith('image/') ? 'hidden' : '')}>
                {getFileIcon(file.fileType, file.fileName)}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                <h4 className="text-sm font-medium truncate">
                  {file.displayName}
                </h4>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    getRetentionBadgeColor(file.retentionInfo.category),
                    "text-xs self-start sm:self-auto"
                  )}
                >
                  {file.retentionInfo.category === 'high' ? 'Permanent' : 
                   `${file.retentionInfo.retentionDays}d`}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-muted-foreground">
                <span>{formatFileSize(file.fileSize)}</span>
                <span className="hidden sm:inline">{formatDate(file.uploadDate)}</span>
                <span className="sm:hidden">{new Date(file.uploadDate).toLocaleDateString()}</span>
                <span className="truncate">{file.retentionInfo.reason}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a 
                  href={`/uploads/${file.fileName}`} 
                  download={file.displayName}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Download file"
                >
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default FileManagerSection;
