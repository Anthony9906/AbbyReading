import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// 设置 worker 路径
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

interface PDFPreviewProps {
  url: string;
  className?: string;
}

export const PDFPreview = ({ url, className }: PDFPreviewProps) => {
  return (
    <div className={className}>
      <Document
        file={url}
        loading={<Loader2 className="w-8 h-8 text-[#6B5ECD] animate-spin" />}
        onLoadSuccess={() => {}}
      >
        <Page 
          pageNumber={1} 
          width={64}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    </div>
  );
}; 