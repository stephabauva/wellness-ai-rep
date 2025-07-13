import React from "react";
import { Card, CardContent } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button"; // For remove button, though a simple 'x' is used
import { getFileIcon } from "@shared";
import { AttachedFile } from "@shared/hooks/useFileManagement";

/**
 * @used-by chat/ChatSection - Display file attachments in chat
 * @used-by chat/ChatInputArea - Preview files before sending
 * @used-by chat/MessageDisplayArea - Show attached files in messages
 * @cross-domain true
 * @shared-component true
 * @critical-path true
 * @risk Different domains may expect different preview behaviors
 * @recommendation Consider domain-specific variants or configuration
 */
interface AttachmentPreviewProps {
  attachedFiles: AttachedFile[] | null;
  onRemoveAttachment: (fileId: string) => void;
}

export function AttachmentPreview({
  attachedFiles,
  onRemoveAttachment,
}: AttachmentPreviewProps) {
  if (!attachedFiles || attachedFiles.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pb-2">
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="relative bg-secondary rounded-lg p-2 min-w-0" // min-w-0 helps with truncation
              >
                {file.fileType.startsWith("image/") ? (
                  <div className="relative">
                    <img
                      src={file.url || `/uploads/${file.fileName}`} // Prefer URL if available
                      alt={file.displayName || file.fileName}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <button
                      onClick={() => onRemoveAttachment(file.id)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-destructive/80"
                      aria-label="Remove attachment"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 max-w-[150px]">
                    {getFileIcon(file.fileType)}
                    <span className="text-xs truncate" title={file.displayName || file.fileName}>
                      {file.displayName || file.fileName}
                    </span>
                    <button
                      onClick={() => onRemoveAttachment(file.id)}
                      className="text-destructive hover:text-destructive/80 ml-1 flex-shrink-0"
                      aria-label="Remove attachment"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
