import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AttachmentPreview } from './AttachmentPreview'; // Adjust path as needed
import { AttachedFile } from '@/hooks/useFileManagement'; // Assuming type path
import { getFileIcon } from '@/utils/chatUtils'; // Actual util for realistic icon rendering

// Mock getFileIcon to simplify testing if complex, or use actual if simple
vi.mock('@/utils/chatUtils', () => ({
  getFileIcon: vi.fn((fileType: string) => <div data-testid={`file-icon-${fileType}`}>Icon</div>),
}));

const mockAttachedFiles: AttachedFile[] = [
  { id: '1', fileName: 'image.png', displayName: 'Image Preview', fileType: 'image/png', fileSize: 1024, url: '/uploads/image.png' },
  { id: '2', fileName: 'document.pdf', displayName: 'Document PDF', fileType: 'application/pdf', fileSize: 2048 },
];

describe('AttachmentPreview', () => {
  it('should render nothing if no attached files are provided', () => {
    render(<AttachmentPreview attachedFiles={null} onRemoveAttachment={vi.fn()} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument(); // Assuming a list or similar container
    expect(screen.queryByText(/Image Preview/i)).not.toBeInTheDocument();
  });

  it('should render nothing if attachedFiles array is empty', () => {
    render(<AttachmentPreview attachedFiles={[]} onRemoveAttachment={vi.fn()} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('should render image previews for image files', () => {
    render(<AttachmentPreview attachedFiles={[mockAttachedFiles[0]]} onRemoveAttachment={vi.fn()} />);
    const image = screen.getByAltText('Image Preview') as HTMLImageElement;
    expect(image).toBeInTheDocument();
    expect(image.src).toContain('/uploads/image.png');
  });

  it('should render file icons for non-image files', () => {
    render(<AttachmentPreview attachedFiles={[mockAttachedFiles[1]]} onRemoveAttachment={vi.fn()} />);
    expect(screen.getByText('Document PDF')).toBeInTheDocument();
    expect(getFileIcon).toHaveBeenCalledWith('application/pdf');
    expect(screen.getByTestId('file-icon-application/pdf')).toBeInTheDocument();
  });

  it('should call onRemoveAttachment with the correct file id when remove button is clicked for an image', () => {
    const handleRemove = vi.fn();
    render(<AttachmentPreview attachedFiles={[mockAttachedFiles[0]]} onRemoveAttachment={handleRemove} />);

    // The remove button for images is identified by its '×' content and specific classes
    // A more robust way would be to add an aria-label or data-testid
    const removeButton = screen.getByRole('button', { name: /Remove attachment/i });
    fireEvent.click(removeButton);

    expect(handleRemove).toHaveBeenCalledWith('1');
  });

  it('should call onRemoveAttachment with the correct file id when remove button is clicked for a non-image file', () => {
    const handleRemove = vi.fn();
    render(<AttachmentPreview attachedFiles={[mockAttachedFiles[1]]} onRemoveAttachment={handleRemove} />);

    const removeButton = screen.getByRole('button', { name: /Remove attachment/i });
    fireEvent.click(removeButton);

    expect(handleRemove).toHaveBeenCalledWith('2');
  });

  it('should render multiple attachments', () => {
    render(<AttachmentPreview attachedFiles={mockAttachedFiles} onRemoveAttachment={vi.fn()} />);
    expect(screen.getByAltText('Image Preview')).toBeInTheDocument();
    expect(screen.getByText('Document PDF')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Remove attachment/i })).toHaveLength(2);
  });

  it('should use displayName if available, otherwise fileName', () => {
    const filesWithDisplayName: AttachedFile[] = [
      { id: '1', fileName: 'actualImage.png', displayName: 'UserFriendlyImage.png', fileType: 'image/png', fileSize: 1024, url: '/uploads/actualImage.png' },
    ];
    render(<AttachmentPreview attachedFiles={filesWithDisplayName} onRemoveAttachment={vi.fn()} />);
    expect(screen.getByAltText('UserFriendlyImage.png')).toBeInTheDocument();

    const filesWithoutDisplayName: AttachedFile[] = [
      { id: '2', fileName: 'documentOnly.pdf', fileType: 'application/pdf', fileSize: 2048 } as AttachedFile, // Cast if displayName is strictly required by type but optional in practice
    ];
     render(<AttachmentPreview attachedFiles={filesWithoutDisplayName} onRemoveAttachment={vi.fn()} />);
    // For non-images, the name is in a span
    expect(screen.getByText('documentOnly.pdf')).toBeInTheDocument();
  });
});
