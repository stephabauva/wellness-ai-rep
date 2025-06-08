
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
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      toast({
        title: "Files deleted",
        description: `Successfully deleted ${data.deletedCount} file(s) and freed ${formatFileSize(data.freedSpace)}`,
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
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">File Manager</h1>
            <p className="text-muted-foreground">
              Manage your uploaded documents and photos
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedFiles.size > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteSelected}
                disabled={deleteFilesMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''}
              </Button>
            )}
            <Button variant="outline" onClick={() => refetch()}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Files ({files.length})</TabsTrigger>
            {categories.map(category => (
              <TabsTrigger key={category.id} value={category.id}>
                <span className="flex items-center gap-1">
                  {category.icon}
                  {category.name} ({category.files.length})
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
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

interface FileListProps {
  files: FileItem[];
  selectedFiles: Set<string>;
  onSelectFile: (fileId: string) => void;
  onSelectAll: () => void;
}

const FileList: React.FC<FileListProps> = ({ 
  files, 
  selectedFiles, 
  onSelectFile, 
  onSelectAll 
}) => {
  const getRetentionBadgeColor = (category: string) => {
    switch (category) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
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
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              selectedFiles.has(file.id) ? "bg-accent" : "hover:bg-muted/50"
            )}
          >
            <Checkbox
              checked={selectedFiles.has(file.id)}
              onCheckedChange={() => onSelectFile(file.id)}
            />
            
            <div className="flex-shrink-0">
              {getFileIcon(file.fileType, file.fileName)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium truncate">
                  {file.displayName}
                </h4>
                <Badge 
                  variant="secondary" 
                  className={getRetentionBadgeColor(file.retentionInfo.category)}
                >
                  {file.retentionInfo.category === 'high' ? 'Permanent' : 
                   `${file.retentionInfo.retentionDays} days`}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{formatFileSize(file.fileSize)}</span>
                <span>{formatDate(file.uploadDate)}</span>
                <span>{file.retentionInfo.reason}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {file.url && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a href={file.url} download>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default FileManagerSection;
