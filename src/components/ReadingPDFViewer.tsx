import { Document, Page, pdfjs } from 'react-pdf';
import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// 配置 worker
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

interface ReadingPDFViewerProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReadingPDFViewer = ({ url, isOpen, onClose }: ReadingPDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);

  if (!isOpen) return null;

  return (
    <div 
      className="reading-pdf-overlay"
    >
      {/* Header */}
      <div style={{
        padding: '0.5rem',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>
      </div>
      
      {/* PDF Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
      }}>
        <Document
          file={url}
          loading={
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              padding: '2rem'
            }}>
              <Loader2 className="animate-spin" />
            </div>
          }
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          {Array.from(new Array(numPages), (_, index) => (
            <div 
              key={`page_${index + 1}`} 
              style={{ 
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <Page
                pageNumber={index + 1}
                width={930} // 调整宽度以适应 Reading Section

                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="pdf-page"
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}; 