import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';
import { PDFViewerModal } from './PDFViewerModal';
import '../styles/components/PDFPreview.css';

// 修改 worker 配置
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFPreviewProps {
  url: string;
  className?: string;
  unitId: string;
  unitTitle: string;
  containerStyle?: 'small' | 'large';
}

export const PDFPreview = ({ url, className, containerStyle = 'small', unitId, unitTitle }: PDFPreviewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div 
        className={`pdf-preview ${containerStyle} ${className || ''}`}
        onClick={() => setIsModalOpen(true)}
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
            pageNumber={1}
            width={containerStyle === 'small' ? 64 : 354}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="pdf-page"
          />
        </Document>
      </div>

      <PDFViewerModal
        url={url}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        unitId={unitId}
        unitTitle={unitTitle}
      />
    </>
  );
}; 