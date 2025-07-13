import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@shared/components/ui/dialog'; // Added DialogFooter, DialogClose
import { Button } from '@/components/ui/button';
import { QrCode, X } from 'lucide-react';

interface QrCodeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  qrCodeDataUrl: string; // URL of the generated QR code image
  fileName?: string; // Optional: to display info about what's being shared
}

export const QrCodeDialog: React.FC<QrCodeDialogProps> = ({
  isOpen,
  onOpenChange,
  qrCodeDataUrl,
  fileName,
}) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Share Files via QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground text-center">
            Scan this QR code with any device to download the selected file(s).
            {fileName && <p className="font-medium mt-1">Sharing: {fileName}</p>}
          </div>
          {qrCodeDataUrl ? (
            <div className="flex justify-center">
              <img
                src={qrCodeDataUrl}
                alt="QR Code for file sharing"
                className="border rounded-lg p-2 bg-white" // Added padding and bg for better QR visibility
                width={300} // Explicit size
                height={300}
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground">Generating QR Code...</div>
          )}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>• Single file: Direct download link.</p>
            <p>• Multiple files: JSON data with all download links.</p>
            <p>• Files will be downloaded to the device's Downloads folder.</p>
          </div>
        </div>
        <DialogFooter className="sm:justify-center"> {/* Centered footer button */}
          <DialogClose asChild>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
