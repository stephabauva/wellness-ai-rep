
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AttachmentPreview } from '@/components/AttachmentPreview';
import { AttachedFile } from '@shared/hooks/useFileManagement';
import testImage from '../assets/test-image.png';

describe('AttachmentPreview', () => {
  it('should render an image with the correct src attribute', () => {
    const mockAttachedFiles: AttachedFile[] = [
      {
        id: '1',
        fileName: 'test-image.png',
        displayName: 'Test Image',
        fileType: 'image/png',
        fileSize: 1024,
        url: testImage,
      },
    ];

    render(<AttachmentPreview attachedFiles={mockAttachedFiles} onRemoveAttachment={() => {}} />);

    const image = screen.getByAltText('Test Image') as HTMLImageElement;
    expect(image).toBeInTheDocument();
    expect(image.src).toContain('test-image.png');
  });
});
