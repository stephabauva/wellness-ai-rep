import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFileUpload } from '@/hooks/useFileUpload'; // Import the hook


interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void; // New prop
}

const predefinedCategories = ["Medical", "Fitness", "General", "Financial", "Personal"];

const FileUploadDialog: React.FC<FileUploadDialogProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(predefinedCategories[0]);
  const { uploadFile, isUploading, error: uploadError } = useFileUpload(); // Use the hook

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setSelectedCategory(predefinedCategories[0]);
    // Do not reset uploadError here, it might be useful to see it briefly
    onClose();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }
    const result = await uploadFile(selectedFile, selectedCategory);
    if (result && !uploadError) {
      onUploadSuccess(); // Call the success callback
      handleClose(); // Close dialog and reset state
    } else if (uploadError) {
      // Error is already set by the hook, display it or log
      console.error("Upload failed:", uploadError);
      // Optionally: alert(`Upload failed: ${uploadError}`);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload New File</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file-input" className="text-right">
              File
            </Label>
            <Input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category-select" className="text-right">
              Category
            </Label>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="col-span-3" id="category-select">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {predefinedCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedFile && (
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-start-2 col-span-3 text-sm text-muted-foreground">
                <p>Selected: {selectedFile.name} ({ (selectedFile.size / 1024).toFixed(2) } KB)</p>
              </div>
            </div>
          )}
          {isUploading && <div className="text-center text-sm text-blue-500">Uploading...</div>}
          {uploadError && <div className="text-center text-sm text-red-500">Error: {uploadError}</div>}
          {!isUploading && !uploadError && <div className="text-center text-sm">File validation and preview placeholder</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadDialog;
