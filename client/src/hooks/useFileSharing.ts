import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FileItem } from '@shared';

export function useFileSharing(allFiles: FileItem[]) { // Takes allFiles to filter selected ones
  const { toast } = useToast();
  const [showQRCodeDialog, setShowQRCodeDialog] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<string>('');

  const handleWebShare = useCallback(async (selectedFileIds: Set<string>) => {
    if (selectedFileIds.size === 0) {
      toast({ title: "No files selected", description: "Please select files to share.", variant: "default" });
      return;
    }

    const selectedFileItems = allFiles.filter(f => selectedFileIds.has(f.id));
    if (selectedFileItems.length === 0 && selectedFileIds.size > 0) {
        toast({ title: "Selected files not found", description: "Please refresh and try again.", variant: "destructive"});
        return;
    }

    if (navigator.share) {
      try {
        const fileNames = selectedFileItems.map(f => f.displayName).join(', ');
        const downloadLinks = selectedFileItems.map(f =>
          `${window.location.origin}/uploads/${f.fileName}` // Ensure this path is correct
        ).join('\n');

        await navigator.share({
          title: `Shared Files: ${fileNames}`,
          text: `Download these files:\n${downloadLinks}`,
          // url: downloadLinks.split('\n')[0] // Optional: a primary URL
        });

        toast({
          title: "Files shared",
          description: "Share dialog opened.",
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') { // AbortError means user cancelled share
          toast({
            title: "Sharing failed",
            description: "Could not share files using Web Share. Try the QR code option.",
            variant: "destructive",
          });
        }
      }
    } else {
      toast({
        title: "Web Share not supported",
        description: "Your browser does not support the Web Share API. Try the QR code option.",
        variant: "default", // Not necessarily an error, just informational
      });
    }
  }, [allFiles, toast]);

  const generateAndShowQRCode = useCallback((selectedFileIds: Set<string>) => {
    if (selectedFileIds.size === 0) {
      toast({ title: "No files selected", description: "Please select files for QR code generation.", variant: "default" });
      return;
    }

    const selectedFileItems = allFiles.filter(f => selectedFileIds.has(f.id));
     if (selectedFileItems.length === 0 && selectedFileIds.size > 0) {
        toast({ title: "Selected files not found", description: "Please refresh and try again.", variant: "destructive"});
        return;
    }

    const downloadLinks = selectedFileItems.map(f =>
      `${window.location.origin}/uploads/${f.fileName}` // Ensure this path is correct
    );

    let qrDataContent: string;
    if (downloadLinks.length === 1) {
      qrDataContent = downloadLinks[0];
    } else {
      qrDataContent = JSON.stringify({
        type: 'multiple_files',
        files: selectedFileItems.map((f, index) => ({
          name: f.displayName,
          url: downloadLinks[index],
          size: f.fileSize
        }))
      });
    }

    // Using a public QR code generation service URL
    const generatedQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrDataContent)}`;
    setQRCodeData(generatedQrCodeUrl);
    setShowQRCodeDialog(true);
  }, [allFiles, toast]);

  return {
    showQRCodeDialog,
    setShowQRCodeDialog,
    qrCodeData,
    shareSelectedFiles: handleWebShare,
    generateAndShowQRCode,
  };
}
