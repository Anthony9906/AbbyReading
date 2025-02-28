import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';
import { PDFViewerModal } from './PDFViewerModal';
import '../styles/components/PDFPreview.css';

// 修改 worker 配置
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;


interface PDFPreviewProps {
  url: string;
  unitId: string;
  unitTitle: string;
  containerStyle?: string;
  fileType: string;
  className?: string;
  onCustomClick?: () => void;
  width?: number;
  height?: number;
  pageNumber?: number;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  url,
  unitId,
  unitTitle,
  containerStyle = 'small',
  fileType,
  className,
  onCustomClick,
  width,
  height,
  pageNumber
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (onCustomClick) {
      onCustomClick();
    } else {
      setIsModalOpen(true);
    }
  };

  const getDefaultWidth = () => {
    if (width) return width;
    return containerStyle === 'small' ? 98 : 354;
  };

  return (
    <>
      <div 
        className={`pdf-preview-container ${containerStyle} ${className}`}
        onClick={handleClick}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <Document
          file={url}
          loading={
            <div className="loading-container">
              <Loader2 className="loading-spinner" />
            </div>
          }
        >
          <Page
            pageNumber={pageNumber || 1}
            width={getDefaultWidth()}
            height={height}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="pdf-page"
          />
        </Document>
      </div>

      {!onCustomClick && (
        <PDFViewerModal
          url={url}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          unitId={unitId}
          unitTitle={unitTitle}
          fileType={fileType as 'reading' | 'report'}
        />
      )}
    </>
  );
}; 