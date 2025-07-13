import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@shared/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@shared/components/ui/label';
import { Input } from '@/components/ui/input';
// Select components are no longer directly used here, but CategorySelector uses them.
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select"';
import { useFileUpload } from '@/hooks/useFileUpload'; // Import the hook
import { CategoryDropdown } from './CategoryDropdown'; // Import the new CategoryDropdown


interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

// const predefinedCategories = ["Medical", "Fitness", "General", "Financial", "Personal"]; // Removed

const FileUploadDialog: React.FC<FileUploadDialogProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // const [selectedCategory, setSelectedCategory] = useState<string>(predefinedCategories[0]); // Removed
  const [currentCategoryId, setCurrentCategoryId] = useState<string | undefined>(undefined); // New state for category ID
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
    // setSelectedCategory(predefinedCategories[0]); // Removed
    setCurrentCategoryId(undefined); // Reset currentCategoryId
    // Do not reset uploadError here, it might be useful to see it briefly
    onClose();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }
    // Use currentCategoryId in the upload call
    const result = await uploadFile(selectedFile, currentCategoryId);
    if (result && !uploadError) {
      onUploadSuccess(); // Call the success callback
      handleClose(); // Close dialog and reset state
    } else if (uploadError) {
      // Error is already set by the hook, display it or log
      console.error("Upload failed:", uploadError);
      // Optionally: alert(`Upload failed: ${uploadError}`);
    }
  };

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
            <Label htmlFor="category-select" className="text-right pt-2"> {/* Added pt-2 for alignment with selector */}
              Category
            </Label>
            <CategoryDropdown
              selectedCategoryId={currentCategoryId}
              onCategoryChange={setCurrentCategoryId}
              placeholder="Select a category (optional)"
              allowClear={true}
              disabled={isUploading}
              className="col-span-3"
            />
            {/* The CategorySelector is a single component, ensure it spans correctly if needed, or adjust grid.
                Assuming CategorySelector's internal SelectTrigger will take col-span-3 effectively if needed,
                or the label and selector are meant to be in separate effective rows if grid-cols-4 is for the whole item.
                For simplicity, placing it directly. If layout is off, may need to wrap CategorySelector or adjust grid.
                The provided CategorySelector structure implies it's a self-contained unit.
                The Label is col-span-1, CategorySelector would implicitly be col-span-3 if the parent div is grid-cols-4.
                Let's ensure the CategorySelector is in the correct grid column.
                The CategorySelector itself will be on the "col-span-3" area.
            */}
          </div>
          {/* The above div should be grid grid-cols-4 items-center gap-4, so CategorySelector will take the remaining space */}
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
