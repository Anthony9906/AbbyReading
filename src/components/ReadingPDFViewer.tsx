import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import '../styles/components/ReadingPDFViewer.css';
import { X, ZoomIn, ZoomOut, Maximize, Minimize, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';

// 设置 PDF.js worker 路径
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

interface ReadingPDFViewerProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  initialPage?: number;
}

export const ReadingPDFViewer = ({ url, isOpen, onClose, initialPage }: ReadingPDFViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
  
  // 监听容器大小变化
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateContainerWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 40); // 减去内边距
      }
    };
    
    // 初始化时更新一次
    updateContainerWidth();
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateContainerWidth);
    
    return () => {
      window.removeEventListener('resize', updateContainerWidth);
    };
  }, [isFullscreen]);
  
  // 处理文档加载成功
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(initialPage || 1);
  };
  
  // 处理页面加载成功，获取 PDF 页面尺寸
  const onPageLoadSuccess = (page: any) => {
    const viewport = page.getViewport({ scale: 1.0 });
    setPdfDimensions({
      width: viewport.width,
      height: viewport.height
    });
  };
  
  // 计算适合容器的缩放比例
  useEffect(() => {
    if (containerWidth && pdfDimensions.width) {
      // 计算适合容器宽度的缩放比例
      const fitScale = containerWidth / pdfDimensions.width;
      // 设置缩放比例，但不超过 1.0（原始大小）
      setScale(Math.min(fitScale, 1.0));
    }
  }, [containerWidth, pdfDimensions.width]);

  // 处理页面变化
  const changePage = (offset: number) => {
    if (!numPages) return;
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.max(1, Math.min(numPages, newPageNumber));
    });
  };

  // 处理缩放
  const handleZoom = (factor: number) => {
    setScale(prevScale => {
      const newScale = prevScale + factor;
      return Math.max(0.5, Math.min(2.5, newScale));
    });
  };
  
  // 处理旋转
  const handleRotate = () => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  };
  
  // 处理全屏切换
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // 监听 ESC 键退出全屏
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`pdf-viewer-overlay ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="pdf-viewer-container">
        <div className="pdf-viewer-header">
          <div className="header-left">
            <h3>Reading Material</h3>
            
            {/* 将分页控件移到顶部 */}
            {numPages && numPages > 1 && (
              <div className="pdf-pagination">
                <button 
                  onClick={() => changePage(-1)}
                  disabled={pageNumber <= 1}
                  className="pagination-button"
                  title="Previous Page"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="page-info">
                  Page {pageNumber} of {numPages}
                </span>
                <button 
                  onClick={() => changePage(1)}
                  disabled={pageNumber >= numPages}
                  className="pagination-button"
                  title="Next Page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
          
          <div className="pdf-viewer-controls">
            <button 
              className="control-button"
              onClick={() => handleZoom(-0.1)}
              title="Zoom Out"
            >
              <ZoomOut size={20} />
            </button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button 
              className="control-button"
              onClick={() => handleZoom(0.1)}
              title="Zoom In"
            >
              <ZoomIn size={20} />
            </button>
            <button 
              className="control-button"
              onClick={handleRotate}
              title="Rotate"
            >
              <RotateCw size={20} />
            </button>
            <button 
              className="control-button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            <button 
              className="control-button close-button"
              onClick={onClose}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="pdf-document-container" ref={containerRef}>
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="loading">Loading PDF...</div>}
            error={<div className="error">Failed to load PDF</div>}
          >
            <Page 
              pageNumber={pageNumber} 
              scale={scale}
              rotate={rotation}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              onLoadSuccess={onPageLoadSuccess}
            />
          </Document>
        </div>
      </div>
    </div>
  );
}; 