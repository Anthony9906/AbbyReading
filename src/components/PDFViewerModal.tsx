import { Document, Page, pdfjs } from 'react-pdf';
import { useState, useEffect } from 'react';
import { Loader2, ZoomIn, ZoomOut, X, Maximize2, Minimize2, FileText, Save } from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '../lib/supabase'; // 修改为正确的路径
import '../styles/components/PDFViewerModal.css';
import { toast } from 'react-hot-toast';

interface PDFViewerModalProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  unitTitle: string;
  existingStory?: string;
  fileType: string;
}

// 初始化 Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);

export const PDFViewerModal = ({ 
  url, 
  isOpen, 
  onClose, 
  unitId, 
  unitTitle,
  existingStory,
  fileType 
}: PDFViewerModalProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfText, setPdfText] = useState<string>('');
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && existingStory) {
      setIsTextVisible(true);
      setPdfText(existingStory);
    }
  }, [isOpen, existingStory]);

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
    setPdfText('');
    
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

        const prompt = fileType === 'reading' 
          ? "请提取这个PDF页面中的所有文本内容，因为这是一篇小学课文，所以只需要识别并提取课文正文内容，不需要识别和提取课文中的标注信息、说明信息、页眉页脚信息、练习题等，课文正文一般是指正文部分和正文中人物的对话内容。另外，请确保按照从上到下，从左到右的顺序提取信息，不要颠倒顺序，不要在没有标点符号的地方换行。只需要返回提取的文本，不需要其他解释。"
          : "请提取这个PDF页面中的所有文本内容，这是一份学生的本周英语学习内容的报告，需要识别并提取这份报告中的本周英语单词和本周语法知识点，英语单词和语法知识点需要分开提取，英语单词直接提取，单词只会出现在第一页上，语法知识点需要提取出语法知识点和例句，不要包含任何中文内容。只需要返回提取的文本，不需要其他解释。";
        
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: "image/jpeg"
            }
          }
        ]);
        
        const response = await result.response;
        fullText += `第 ${i} 页\n${response.text()}\n\n`;
      }
      
      setPdfText(fullText);
      toast.success('文本识别完成！');
    } catch (error) {
      console.error('提取PDF文本时出错:', error);
      setPdfText('');
      toast.error('提取文本失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const cleanJsonString = (jsonString: string): string => {
    // 找到第一个 { 和最后一个 } 的位置
    const start = jsonString.indexOf('{');
    const end = jsonString.lastIndexOf('}') + 1;
    
    if (start === -1 || end === 0) {
      throw new Error('Invalid JSON structure');
    }
    
    // 提取有效的 JSON 部分
    let cleanedJson = jsonString.slice(start, end);
    
    // 处理可能的转义字符
    cleanedJson = cleanedJson
      .replace(/\\n/g, ' ')        // 替换换行
      .replace(/\\"/g, '"')        // 处理转义的引号
      .replace(/\\/g, '\\')        // 处理其他转义字符
      .replace(/\s+/g, ' ');       // 压缩多余空格
    
    return cleanedJson;
  };

  const saveVocabularyAndGrammar = async (parsedResult: any) => {
    try {
      // 先删除该单元已有的单词和语法记录
      const { error: deleteVocabError } = await supabase
        .from('vocabulary')
        .delete()
        .eq('unit_id', unitId);

      if (deleteVocabError) throw deleteVocabError;

      const { error: deleteGrammarError } = await supabase
        .from('grammar')
        .delete()
        .eq('unit_id', unitId);

      if (deleteGrammarError) throw deleteGrammarError;

      // 保存单词 - 兼容大小写
      const vocabularyArray = parsedResult.Vocabulary || parsedResult.vocabulary;
      if (vocabularyArray?.length > 0) {
        const vocabularyData = vocabularyArray.map((vocab: any) => ({
          unit_id: unitId,
          word: vocab.word,
          part_of_speech: vocab.part_of_speech,
          phonetic: vocab.phonetic,
          english_definition: vocab.english_definition,
          chinese_definition: vocab.chinese_definition,
          english_example: vocab.english_example,
          chinese_example: vocab.chinese_example,
          created_at: new Date().toISOString()
        }));

        const { error: insertVocabError } = await supabase
          .from('vocabulary')
          .insert(vocabularyData);

        if (insertVocabError) {
          console.error('Vocabulary Insert Error:', insertVocabError);
          throw insertVocabError;
        }
      }

      // 保存语法 - 兼容大小写
      const grammarArray = parsedResult.Grammar || parsedResult.grammar;
      if (grammarArray?.length > 0) {
        const grammarData = grammarArray.map((gram: any) => ({
          unit_id: unitId,
          grammar_original_text: gram.grammar_original_text || gram.grammarOriginalText,
          grammar_point: gram.grammar_point || gram.grammarPoint,
          explanation: gram.explanation,
          example: gram.example,
          exercise: gram.exercise,
          solution: gram.solution,
          summary: gram.summary,
          created_at: new Date().toISOString()
        }));

        const { error: insertGrammarError } = await supabase
          .from('grammar')
          .insert(grammarData);

        if (insertGrammarError) {
          console.error('Grammar Insert Error:', insertGrammarError);
          throw insertGrammarError;
        }
      }

      console.log('Successfully saved vocabulary and grammar');
    } catch (error) {
      console.error('保存单词和语法时出错:', error);
      throw error;
    }
  };

  const handleSaveReport = async () => {
    setIsSaving(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const prompt = `请为这段文本中Vocabulary中的每一个英语单词添加解析，解析的内容包括word、part_of_speech、phonetic、english_definition、chinese_definition、english_example、chinese_example。然后分析Grammar中的语法知识点内容，提供必要的语法解析和学习技巧的补充，并且适合小学生理解，提供例句和练习，帮我按grammar_original_text、grammar_point、explanation、example、exercise、solution、summary的顺序组织内容，请将你对单词和语法的分析结果以JSON的格式返回，注意单词的每一个信息都要分开，语法部分按顺序将每个语法知识点分开即可，对JSON中包含的特殊字符进行处理，以便我能正常解析。`;

      const result = await model.generateContent([
        prompt,
        pdfText
      ]);
      
      const response = await result.response;
      const analysisResult = response.text();
      
      try {
        const cleanedJson = cleanJsonString(analysisResult);
        const parsedResult = JSON.parse(cleanedJson);

        // 保存周报
        const { data: existingReport, error: checkError } = await supabase
          .from('weekly_report')
          .select('id')
          .eq('unit_id', unitId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingReport) {
          const confirmed = window.confirm(
            '这个单元已经有一个周报了，是否要替换它？'
          );

          if (!confirmed) {
            setIsSaving(false);
            return;
          }

          const { error: updateError } = await supabase
            .from('weekly_report')
            .update({
              content: parsedResult,
              original_text: pdfText,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingReport.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('weekly_report')
            .insert([{
              unit_id: unitId,
              unit_title: unitTitle,
              content: parsedResult,
              original_text: pdfText,
              created_at: new Date().toISOString()
            }]);

          if (insertError) throw insertError;
        }

        // 保存单词和语法
        await saveVocabularyAndGrammar(parsedResult);
        
        toast.success('周报保存成功！');
        onClose();
      } catch (parseError) {
        console.error('Raw AI response:', analysisResult);
        console.error('Failed to parse AI response:', parseError);
        toast.error('AI返回格式解析失败');
        return;
      }
    } catch (error) {
      console.error('分析作业内容时出错:', error);
      toast.error('分析失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStory = async () => {
    if (fileType === 'report') {
      handleSaveReport();
      return;
    }

    setIsSaving(true);
    try {
      const { data: existingStory, error: checkError } = await supabase
        .from('stories')
        .select('id')
        .eq('unit_id', unitId)
        .eq('type', 'inclass')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingStory) {
        const confirmed = window.confirm(
          '这个单元已经有一个课文故事了，是否要替换它？'
        );

        if (!confirmed) {
          setIsSaving(false);
          return;
        }

        const { error: updateError } = await supabase
          .from('stories')
          .update({
            content: pdfText,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStory.id);

        if (updateError) throw updateError;
        
        toast.success('故事更新成功！');
      } else {
        const { error: insertError } = await supabase
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

        if (insertError) throw insertError;
        
        toast.success('故事保存成功！');
      }

      onClose();
    } catch (error) {
      console.error('保存故事时出错:', error);
      toast.error('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pdf-viewer__overlay">
      <div className="pdf-viewer__container">
        <div className="pdf-viewer__header">
          <div className="pdf-viewer__controls">
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
              className="pdf-viewer__control-button"
            >
              <ZoomOut className="pdf-viewer__control-icon" />
            </button>
            <span className="pdf-viewer__scale-text">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(s => Math.min(2, s + 0.1))}
              className="pdf-viewer__control-button"
            >
              <ZoomIn className="pdf-viewer__control-icon" />
            </button>
            <button
              onClick={extractTextFromPDF}
              className="pdf-viewer__control-button"
              disabled={isLoading}
            >
              <FileText className="pdf-viewer__control-icon" />
              <span className="pdf-viewer__button-text">
                {fileType === 'reading' ? 'AI 识别课文' : 'AI 识别作业'}
              </span>
            </button>
            {isTextVisible && (
              <button
                onClick={handleSaveStory}
                className="pdf-viewer__control-button"
                disabled={isSaving || !pdfText}
              >
                <Save className="pdf-viewer__control-icon" />
                <span className="pdf-viewer__button-text">
                  {fileType === 'reading' ? '保存故事' : '保存作业'}
                </span>
                {isSaving && <Loader2 className="pdf-viewer__loading-spinner" />}
              </button>
            )}
          </div>
          <div className="pdf-viewer__controls">
            <button
              onClick={handleFullscreen}
              className="pdf-viewer__control-button"
            >
              {isFullscreen ? (
                <Minimize2 className="pdf-viewer__control-icon" />
              ) : (
                <Maximize2 className="pdf-viewer__control-icon" />
              )}
            </button>
            <button
              onClick={onClose}
              className="pdf-viewer__control-button"
            >
              <X className="pdf-viewer__control-icon" />
            </button>
          </div>
        </div>

        <div className="pdf-viewer__content">
          <div className="pdf-viewer__document">
            <Document
              file={url}
              loading={
                <div className="pdf-viewer__loading-container">
                  <Loader2 className="pdf-viewer__loading-spinner" />
                </div>
              }
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            >
              {Array.from(new Array(numPages), (_, index) => (
                <div key={`page_${index + 1}`} className="pdf-viewer__page" data-page-number={index + 1}>
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
            <div className="pdf-viewer__sidebar">
              <div className={`pdf-viewer__text-content ${isLoading ? 'loading' : ''}`}>
                {isLoading ? (
                  <div className="pdf-viewer__text-loading">
                    <Loader2 className="pdf-viewer__loading-spinner" />
                    <div className="pdf-viewer__loading-text">正在识别文本...</div>
                  </div>
                ) : (
                  <textarea
                    value={pdfText}
                    onChange={(e) => setPdfText(e.target.value)}
                    className="pdf-viewer__text-area"
                    placeholder="识别的文本将显示在这里..."
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 