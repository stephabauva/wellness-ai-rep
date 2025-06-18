import { useState, useCallback } from 'react';
import { useToast } from './use-toast'; // Adjusted path
import { FileItem } from '../types/fileManager'; // Adjusted path
import { Share } from 'react-native'; // TODO: RN-Adapt - Import Share API from React Native

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

    // TODO: RN-Adapt - Replace navigator.share with React Native's Share API
    // if (navigator.share) { // Web specific
    try {
      const fileNames = selectedFileItems.map(f => f.displayName).join(', ');
      // For React Native, you might share local file URIs if files are downloaded,
      // or server URLs if they are accessible.
      // Example: const urlsToShare = selectedFileItems.map(f => f.url || f.uri).filter(Boolean) as string[];
      const downloadLinks = selectedFileItems.map(f =>
        f.url || `file://${f.fileName}` // Placeholder: use server URL or local URI if available
      ).join('\n');

      // await navigator.share({ // Web specific
      //   title: `Shared Files: ${fileNames}`,
      //   text: `Download these files:\n${downloadLinks}`,
      // });
      await Share.share({
        title: `Shared Files: ${fileNames}`,
        message: `Download these files:\n${downloadLinks}`, // `message` is the primary content for RN Share
        // url: downloadLinks.split('\n')[0] // Optional: a primary URL (iOS only for message, Android for subject)
      });

      toast({
        title: "Files shared",
        description: "Share dialog opened.",
      });
    } catch (error: any) {
      if (error.name !== 'AbortError' && error.message !== 'User did not share') { // AbortError or user cancellation
        toast({
          title: "Sharing failed",
          // description: "Could not share files using Web Share. Try the QR code option.", // Web specific
          description: "Could not share files. Try the QR code option or check permissions.",
          variant: "destructive",
        });
      }
    }
    // } else { // Web specific
    //   toast({
    //     title: "Web Share not supported",
    //     description: "Your browser does not support the Web Share API. Try the QR code option.",
    //     variant: "default",
    //   });
    // }
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

    // TODO: RN-Adapt - window.location.origin is not available. Use a pre-configured base URL for downloads if needed,
    // or ensure f.url is a fully qualified URL from the server.
    // For local files, QR codes might point to a service that can serve them or a deep link.
    const downloadLinks = selectedFileItems.map(f =>
      f.url || `YOUR_APP_FILE_DOWNLOAD_BASE_URL/${f.fileName}` // Placeholder if f.url is not absolute
      // `${window.location.origin}/uploads/${f.fileName}`
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
