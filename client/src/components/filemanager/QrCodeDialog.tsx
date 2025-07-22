import React from 'react';
// Removed problematic Dialog import - using custom modal implementation
import { Button } from '@shared/components/ui/button';
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Share Files via QR Code
          </h3>
        </div>
        
        {/* Modal Content */}
        <div className="space-y-4 py-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Scan this QR code with any device to download the selected file(s).
            {fileName && <p className="font-medium mt-1 text-gray-800 dark:text-gray-200">Sharing: {fileName}</p>}
          </div>
          {qrCodeDataUrl ? (
            <div className="flex justify-center">
              <img
                src={qrCodeDataUrl}
                alt="QR Code for file sharing"
                className="border rounded-lg p-2 bg-white" 
                width={300}
                height={300}
              />
            </div>
          ) : (
            <div className="text-center text-gray-600 dark:text-gray-400">Generating QR Code...</div>
          )}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
            <p>• Single file: Direct download link.</p>
            <p>• Multiple files: JSON data with all download links.</p>
            <p>• Files will be downloaded to the device's Downloads folder.</p>
          </div>
        </div>
        
        {/* Modal Footer */}
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
