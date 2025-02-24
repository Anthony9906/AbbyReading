import { Document, Page, pdfjs } from 'react-pdf';
import { useState } from 'react';
import { Loader2, ZoomIn, ZoomOut, X, Maximize2, Minimize2, FileText, Save } from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '../lib/supabase'; // 修改为正确的路径
import '../styles/components/PDFViewerModal.css';

interface PDFViewerModalProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  unitId: string;  // 添加 unit id prop
  unitTitle: string;  // 添加 unit title prop
}

// 初始化 Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);

export const PDFViewerModal = ({ url, isOpen, onClose, unitId, unitTitle }: PDFViewerModalProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfText, setPdfText] = useState<string>('');
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const extractTextFromPDF = async () => {
    setIsLoading(true);
    setIsTextVisible(true);
    setPdfText('正在准备识别...');
    
    try {
      const pdf = await pdfjs.getDocument(url).promise;
      let fullText = '';
      
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context!,
          viewport: viewport
        }).promise;
        
        const base64Image = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        
        const result = await model.generateContent([
          "请提取这个PDF页面中的所有文本内容，因为这是一篇小学课文，所以只需要识别并提取课文正文内容，不需要识别和提取课文中的标注信息、说明信息、页眉页脚信息、练习题等，课文正文一般是指正文部分和正文中人物的对话内容。另外，请确保按照从上到下，从左到右的顺序提取信息，不要颠倒顺序。只需要返回提取的文本，不需要其他解释。",
          {
            inlineData: {
              data: base64Image,
              mimeType: "image/jpeg"
            }
          }
        ]);
        
        const response = await result.response;
        fullText += `第 ${i} 页\n${response.text()}\n\n`;
        
        // 添加进度提示
        setPdfText(fullText + `\n正在处理第 ${i}/${pdf.numPages} 页...`);
      }
      
      setPdfText(fullText);
    } catch (error) {
      console.error('提取PDF文本时出错:', error);
      setPdfText('提取文本失败，请重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStory = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('stories')
        .insert([
          {
            unit_id: unitId,
            title: unitTitle,
            content: pdfText,
            type: 'inclass',
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;
      
      alert('故事保存成功！');
      onClose();
    } catch (error) {
      console.error('保存故事时出错:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pdf-modal-overlay">
      <div className="pdf-modal-container">
        <div className="modal-header">
          <div className="header-controls">
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
              className="control-button"
            >
              <ZoomOut className="control-icon" />
            </button>
            <span className="scale-text">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(s => Math.min(2, s + 0.1))}
              className="control-button"
            >
              <ZoomIn className="control-icon" />
            </button>
            <button
              onClick={extractTextFromPDF}
              className="control-button"
              disabled={isLoading}
            >
              <FileText className="control-icon" />
              <span className="button-text">识别文本</span>
            </button>
            {isTextVisible && (
              <button
                onClick={handleSaveStory}
                className="control-button"
                disabled={isSaving || !pdfText}
              >
                <Save className="control-icon" />
                <span className="button-text">
                  {isSaving ? '保存中...' : '保存故事'}
                </span>
              </button>
            )}
          </div>
          <div className="header-controls">
            <button
              onClick={handleFullscreen}
              className="control-button"
            >
              {isFullscreen ? (
                <Minimize2 className="control-icon" />
              ) : (
                <Maximize2 className="control-icon" />
              )}
            </button>
            <button
              onClick={onClose}
              className="control-button"
            >
              <X className="control-icon" />
            </button>
          </div>
        </div>

        <div className="modal-content">
          <div className={`pdf-viewer ${isTextVisible ? 'with-sidebar' : ''}`}>
            <Document
              file={url}
              loading={
                <div className="loading-container">
                  <Loader2 className="loading-spinner" />
                </div>
              }
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            >
              {Array.from(new Array(numPages), (_, index) => (
                <div key={`page_${index + 1}`} className="pdf-page">
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </div>
              ))}
            </Document>
          </div>

          {isTextVisible && (
            <div className="text-sidebar">
              {isLoading ? (
                <div className="loading-container">
                  <Loader2 className="loading-spinner" />
                </div>
              ) : (
                <textarea
                  value={pdfText}
                  onChange={(e) => setPdfText(e.target.value)}
                  className="text-area"
                  placeholder="识别的文本将显示在这里..."
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 