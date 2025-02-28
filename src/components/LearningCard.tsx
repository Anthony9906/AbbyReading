"use client";

import { useState, useEffect } from 'react';
import { School, BookOpenCheck, BrainCircuit, Play, Square, MessageCircleMore, Quote, Pencil, CheckCircle2, ListChecks, MessageSquareQuote, Award, Book, CheckCircle, BarChart2, Clock, FileText, Brain, BookOpen, Eye, EyeOff } from "lucide-react";
import { supabase } from '../lib/supabase';
import '../styles/components/LearningCard.css';
import { VocabPopover } from './VocabPopover';
import OpenAI from 'openai';
import { toast } from 'react-hot-toast';
import { PDFPreview } from './PDFPreview';
import { ReadingPDFViewer } from './ReadingPDFViewer';
import { ReadingQuizModal } from './ReadingQuizModal';
import '../styles/components/ReadingQuizModal.css';
import { GrammarQuizModal } from './GrammarQuizModal';
import { useAppSelector } from "../redux/hooks";
import { pdfjs } from 'react-pdf';

interface VocabWord {
  word: string;
  part_of_speech: string;
  phonetic: string;
  english_definition: string;
  chinese_definition: string;
  english_example: string;
  chinese_example: string;
}

interface WordSelection {
  word: string;
  position: { x: number; y: number };
  details?: VocabWord;
  isLoading: boolean;
  noResult: boolean;
}

interface TextSelection {
  text: string;
  position: { x: number; y: number };
  isPlaying: boolean;
}

interface QuizStats {
  totalQuizzes: number;
  totalSubmissions: number;
  accuracyRate: number;
}

const openai_tts = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_WILDCARD_API_KEY,
  baseURL: import.meta.env.VITE_OPENAI_WILDCARD_BASE_URL,
  dangerouslyAllowBrowser: true // 允许在浏览器中使用
});

// 添加 getFileUrl 函数
const getFileUrl = (path: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage
    .from('unit-files')
    .getPublicUrl(path);
  return data?.publicUrl;
};

export const LearningCard = () => {
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [selectedWord, setSelectedWord] = useState<WordSelection | null>(null);
  const [selectedText, setSelectedText] = useState<TextSelection | null>(null);
  const [readingSpeed, setReadingSpeed] = useState<'very_slow' | 'slow' | 'normal'>('normal');
  const [activeSlide, setActiveSlide] = useState(0);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [showReadingQuiz, setShowReadingQuiz] = useState(false);
  const [readingUnicorns, setReadingUnicorns] = useState(0);
  const [grammarUnicorns, setGrammarUnicorns] = useState(0);
  const [storyUnicorns, setStoryUnicorns] = useState(0);
  const [quizStats, setQuizStats] = useState<QuizStats>({
    totalQuizzes: 0,
    totalSubmissions: 0,
    accuracyRate: 0
  });
  const [showGrammarQuiz, setShowGrammarQuiz] = useState(false);
  const [selectedGrammarPoint, setSelectedGrammarPoint] = useState<any>(null);
  const [showReadingPreview, setShowReadingPreview] = useState(true);
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [initialPdfPage, setInitialPdfPage] = useState(1);

  // 从 Redux 获取单元数据
  const { data: units, status } = useAppSelector((state) => state.units);
  
  // 当单元数据加载完成后，自动选择第一个单元
  useEffect(() => {
    if (status === 'succeeded' && units.length > 0 && !selectedUnit) {
      setSelectedUnit(units[0]);
    }
  }, [status, units, selectedUnit]);

  // 如果数据仍在加载中，显示加载状态
  if (status === 'loading') {
    return <div className="learning-card-loading">Loading...</div>;
  }

  const handleUnitChange = (unitId: string) => {
    const unit = units.find((u: any) => u.id === unitId);
    setSelectedUnit(unit || null);
  };

  const handleWordClick = async (word: string, event: React.MouseEvent) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    
    setSelectedWord({
      word,
      position: {
        x: rect.left + (rect.width / 2),
        y: rect.top,
      },
      isLoading: true,
      noResult: false
    });
    
    try {
      // 先尝试精确匹配
      let { data } = await supabase
        .from('vocabulary')
        .select(`
          word,
          part_of_speech,
          phonetic,
          english_definition,
          chinese_definition,
          english_example,
          chinese_example
        `)
        .eq('unit_id', selectedUnit?.id)
        .ilike('word', word)
        .maybeSingle();

      // 如果没有找到，尝试基本形式匹配
      if (!data) {
        const baseWord = word.toLowerCase()
          .replace(/ies$/, 'y')    // babies -> baby
          .replace(/es$/, '')      // boxes -> box
          .replace(/s$/, '');      // kids -> kid
        
        const { data: baseData } = await supabase
          .from('vocabulary')
          .select('*')
          .eq('unit_id', selectedUnit?.id)
          .ilike('word', baseWord)
          .maybeSingle();

        if (baseData) {
          data = baseData;
        }
      }

      setSelectedWord(prev => prev ? {
        ...prev,
        isLoading: false,
        details: data ? {
          word: data.word,
          part_of_speech: data.part_of_speech,
          phonetic: data.phonetic,
          english_definition: data.english_definition,
          chinese_definition: data.chinese_definition,
          english_example: data.english_example,
          chinese_example: data.chinese_example
        } : undefined,
        noResult: !data
      } : null);
    } catch (error) {
      console.error('Error fetching word details:', error);
      setSelectedWord(prev => prev ? {
        ...prev,
        isLoading: false,
        noResult: true
      } : null);
    }
  };

  const highlightVocabulary = (text: string, words: string[]) => {
    const regex = new RegExp(`\\b\\w*(?:${words.join('|')})\\w*\\b`, 'gi');
    const paragraphs = text.split('\n');
    
    return paragraphs.map((paragraph, index) => {
      // 对于空行，返回一个空的段落元素
      if (!paragraph.trim()) {
        return <p key={index} className="story-paragraph empty-line">&nbsp;</p>;
      }
      
      const matches = [...paragraph.matchAll(regex)];
      let lastIndex = 0;
      const parts = [];
      
      // 添加朗读图标
      parts.push(
        <button
          key={`play-${index}`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedText({
              text: paragraph,
              position: {
                x: e.currentTarget.getBoundingClientRect().right + 260,
                y: e.currentTarget.getBoundingClientRect().top,
              },
              isPlaying: true
            });
            handlePlay(paragraph);
          }}
          className="play-line-button"
          title="Read this line"
        >
          <MessageCircleMore size={20} />
        </button>
      );
      
      // 处理段落文本
      for (const match of matches) {
        if (match.index! > lastIndex) {
          parts.push(paragraph.slice(lastIndex, match.index));
        }
        
        parts.push(
          <span 
            key={match.index}
            className="highlight"
            onClick={(e) => handleWordClick(match[0], e)}
          >
            {match[0]}
          </span>
        );
        
        lastIndex = match.index! + match[0].length;
      }
      
      if (lastIndex < paragraph.length) {
        parts.push(paragraph.slice(lastIndex));
      }
      
      return (
        <p key={index} className="story-paragraph">
          {parts}
        </p>
      );
    });
  };

  // 添加点击外部关闭气泡的处理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 处理单词气泡框
      if (selectedWord && 
          !((event.target as Element).closest('.vocab-popover') || 
            (event.target as Element).closest('.highlight') ||
            (event.target as Element).closest('.word-tag'))) {
        setSelectedWord(null);
      }
      
      // 处理阅读气泡框
      if (selectedText && 
          !((event.target as Element).closest('.text-selection-popover') || 
            (event.target as Element).closest('.play-line-button'))) {
        setSelectedText(null);
      }
    };

    // 使用 setTimeout 延迟添加事件监听器，确保不会立即触发
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      clearTimeout(timer);
    };
  }, [selectedWord, selectedText]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectedText({
        text,
        position: {
          x: rect.left + (rect.width / 2),
          y: rect.top,
        },
        isPlaying: false
      });
    }
  };

  const handlePlay = async (text?: string) => {
    const textToPlay = text || selectedText?.text;
    if (!textToPlay) return;

    if (!text) {
      setSelectedText(prev => prev ? { ...prev, isPlaying: true } : null);
    }

    try {
      // 根据选择的速度设置 speed 参数
      const speed = {
        'very_slow': 0.5,  // 很慢
        'slow': 0.75,      // 慢
        'normal': 1.0      // 正常
      }[readingSpeed];

      const mp3 = await openai_tts.audio.speech.create({
        model: "tts-1",
        voice: "echo",
        input: textToPlay,
        speed: speed
      });

      const blob = await mp3.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (!text) {
          setSelectedText(prev => prev ? { ...prev, isPlaying: false } : null);
        }
      };

      await audio.play();
    } catch (error) {
      console.error('Error with OpenAI TTS:', error);
      toast.error('Failed to play audio. Please try again.');
      if (!text) {
        setSelectedText(prev => prev ? { ...prev, isPlaying: false } : null);
      }
    }
  };

  const handleStop = () => {
    setSelectedText(prev => prev ? { ...prev, isPlaying: false } : null);
  };

  // 添加新的 useEffect 来获取 unicorn 记录
  useEffect(() => {
    const fetchUnicornCounts = async () => {
      if (!selectedUnit) return;
      
      try {
        
        // 获取当前用户
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;
        
        // 获取 in-class-reading 类型的记录
        const { data: readingData, error: readingError } = await supabase
          .from('unicorn_records')
          .select('id')
          .eq('user_id', userData.user.id)
          .eq('unit_id', selectedUnit.id)
          .eq('quiz_type', 'in-class-reading');
          
        if (readingError) throw readingError;
        
        // 获取 grammar 类型的记录
        const { data: grammarData, error: grammarError } = await supabase
          .from('unicorn_records')
          .select('id')
          .eq('user_id', userData.user.id)
          .eq('unit_id', selectedUnit.id)
          .eq('quiz_type', 'grammar');
          
        if (grammarError) throw grammarError;
        
        // 获取 story-reading 类型的记录
        const { data: storyData, error: storyError } = await supabase
          .from('unicorn_records')
          .select('id')
          .eq('user_id', userData.user.id)
          .eq('unit_id', selectedUnit.id)
          .eq('quiz_type', 'story-reading');
          
        if (storyError) throw storyError;
        
        // 设置各类型的 unicorn 数量（最多5个）
        setReadingUnicorns(Math.min(readingData.length, 5));
        setGrammarUnicorns(Math.min(grammarData.length, 5));
        setStoryUnicorns(Math.min(storyData.length, 5));
        
      } catch (error) {
        console.error('Error fetching unicorn counts:', error);
      } finally {

      }
    };
    
    fetchUnicornCounts();
  }, [selectedUnit]);

  // 获取当前活动标签的 unicorn 数量
  const getActiveUnicorns = () => {
    switch (activeSlide) {
      case 0: return readingUnicorns;
      case 1: return grammarUnicorns;
      case 2: return storyUnicorns;
      default: return 0;
    }
  };

  // 添加新的 useEffect 来获取 quiz 统计数据
  useEffect(() => {
    const fetchQuizStats = async () => {
      if (!selectedUnit) return;
      try {
        // 获取当前用户
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;
        
        // 获取本单元 in-class-reading 类型的唯一 quiz_id 总数
        const { data: quizData, error: quizError } = await supabase
        .from('reading_quiz')
        .select('quiz_id')
        .eq('unit_id', selectedUnit.id)
        .eq('type', 'in_class_reading');
        
        if (quizError) throw quizError;
        // 提取唯一的 quiz_id 列表
        const uniqueQuizIds = [...new Set(quizData.map(item => item.quiz_id))];
        
        // 获取这些 quiz 的提交记录，包括正确性
        const { data: submissionData, error: submissionError } = await supabase
          .from('reading_quiz_records')
          .select('quiz_id, is_correct')
          .in('quiz_id', uniqueQuizIds);
          
        if (submissionError) throw submissionError;
        
        // 提取唯一的提交 quiz_id 列表（每个 quiz 只计算一次提交）
        const uniqueSubmissionQuizIds = [...new Set(submissionData.map(item => item.quiz_id))];
        
        // 计算正确率
        const totalSubmissions = submissionData.length;
        const correctSubmissions = submissionData.filter(item => item.is_correct).length;
        const accuracyRate = totalSubmissions > 0 
          ? Math.round((correctSubmissions / totalSubmissions) * 100) 
          : 0;
        
        // 设置 quiz 统计数据
        setQuizStats({
          totalQuizzes: uniqueQuizIds.length,
          totalSubmissions: uniqueSubmissionQuizIds.length,
          accuracyRate: accuracyRate
        });
        
      } catch (error) {
        console.error('Error fetching quiz stats:', error);
      }
    };
    
    fetchQuizStats();
  }, [selectedUnit]);

  // 添加这个函数来获取PDF的页数
  const fetchPdfPageCount = async (url: string) => {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
      
      const loadingTask = pdfjs.getDocument(url);
      const pdf = await loadingTask.promise;
      setPdfPageCount(pdf.numPages);
      return pdf.numPages;
    } catch (error) {
      console.error('Error fetching PDF page count:', error);
      return 1;
    }
  };

  // 当选择的单元改变时，获取PDF页数
  useEffect(() => {
    if (selectedUnit?.reading_file) {
      const url = getFileUrl(selectedUnit.reading_file);
      if (url) {
        fetchPdfPageCount(url);
      }
    }
  }, [selectedUnit]);

  // 添加这个函数来打开PDF查看器并跳转到指定页面
  const openPDFViewerAtPage = (pageNumber: number) => {
    setInitialPdfPage(pageNumber);
    setShowPDFViewer(true);
  };

  return (
    <div className="learning-card-container">
      {/* 移动到顶部的按钮组 */}
      <div className="learning-card-tabs">
        <button 
          className={`tab-button ${activeSlide === 0 ? 'active' : ''}`}
          onClick={() => setActiveSlide(0)}
        >
          <School size={20} />
          <span>In School</span>
        </button>
        <button 
          className={`tab-button ${activeSlide === 1 ? 'active' : ''}`}
          onClick={() => setActiveSlide(1)}
        >
          <BookOpenCheck size={20} />
          <span>Grammar</span>
        </button>
        <button 
          className={`tab-button ${activeSlide === 2 ? 'active' : ''}`}
          onClick={() => setActiveSlide(2)}
        >
          <BrainCircuit size={20} />
          <span>Stories</span>
        </button>
        
        {/* 添加 unicorn 图标显示 */}
        <div className="tab-unicorns">
          {Array(5).fill(0).map((_, index) => (
            <div key={`unicorn-${index}`} className="tab-unicorn-icon">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="28" 
                height="28" 
                viewBox="0 0 32 32" 
                fill="none" 
                stroke={index < getActiveUnicorns() ? "#8d4bb9" : "#cccccc"} 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={index < getActiveUnicorns() ? 'active' : 'inactive'}
              >
                <path d="m15.6 4.8 2.7 2.3"/>
                <path d="M15.5 10S19 7 22 2c-6 2-10 5-10 5"/>
                <path d="M11.5 12H11"/>
                <path d="M5 15a4 4 0 0 0 4 4h7.8l.3.3a3 3 0 0 0 4-4.46L12 7c0-3-1-5-1-5S8 3 8 7c-4 1-6 3-6 3"/>
                <path d="M2 4.5C4 3 6 3 6 3l2 4"/>
                <path d="M6.14 17.8S4 19 2 22"/>
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* 主卡片内容 */}
      <div className="learning-card">
        {/* 主要内容卡片 */}
        <div className="content-card">
          <div className="content-header">
            <h2 className="content-title">{selectedUnit?.title || 'Select a unit'}</h2>
            <div className="select-container">
              <select 
                className="level-select"
                value={selectedUnit?.id || ''}
                onChange={(e) => handleUnitChange(e.target.value)}
              >
                {units.map((unit: any) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.title}
                  </option>
                ))}
              </select>
              <div className="select-arrow">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6L8 10L12 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="content-sections">
            {/* Slides Container */}
            <div className="slides-container">
                <div className="slides" >
                  {/* Reading Section - Slide 1 */}
                  <div className={`slide ${activeSlide === 0 ? 'active' : ''}`}>
                    <div className="reading-section" style={{ position: 'relative' }}>
                      <div className="reading-header">
                        
                        {/* Reading Quiz Button */}
                        <button
                          className="reading-quiz-button"
                          onClick={() => setShowReadingQuiz(true)}
                          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" 
                              width="32" 
                              height="32" 
                              viewBox="0 0 26 26" 
                              fill="none" 
                              stroke="#ffffff96" 
                              strokeWidth="1.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              className="lucide lucide-unicorn-head">
                                <path d="m15.6 4.8 2.7 2.3"/>
                                <path d="M15.5 10S19 7 22 2c-6 2-10 5-10 5"/>
                                <path d="M11.5 12H11"/>
                                <path d="M5 15a4 4 0 0 0 4 4h7.8l.3.3a3 3 0 0 0 4-4.46L12 7c0-3-1-5-1-5S8 3 8 7c-4 1-6 3-6 3"/>
                                <path d="M2 4.5C4 3 6 3 6 3l2 4"/>
                                <path d="M6.14 17.8S4 19 2 22"/>
                            </svg>
                          Reading Quiz
                        </button>
                      </div>
                      
                      {/* 预览切换按钮 - 放在右下角 */}
                      <button 
                        className="preview-toggle-button"
                        onClick={() => setShowReadingPreview(!showReadingPreview)}
                        style={{
                          position: 'absolute',
                          right: '80px',
                          top: '164px',
                          zIndex: 11
                        }}
                      >
                        {showReadingPreview ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                      
                      {/* 使用条件渲染控制预览的显示和隐藏 */}
                      {selectedUnit?.reading_file && (
                        <div 
                          className="reading-preview" 
                          style={{
                            position: 'absolute',
                            top: '178px',
                            right: '40px',
                            zIndex: 10,
                            opacity: showReadingPreview ? 1 : 0,
                            visibility: showReadingPreview ? 'visible' : 'hidden',
                            transform: showReadingPreview ? 'translateX(0)' : 'translateX(30px)',
                            transition: 'opacity 0.5s ease, visibility 0.5s ease, transform 0.5s ease',
                          }}
                        >
                          {/* Quiz Stats - 移到PDF预览上方 */}
                          <div className="quiz-stats">
                            <div className="quiz-stat-item">
                              <span className="quiz-stat-label">Quizzes:</span>
                              <span className="quiz-stat-value">{quizStats.totalQuizzes}</span>
                            </div>
                            <div className="quiz-stat-item">
                              <span className="quiz-stat-label">Submissions:</span>
                              <span className="quiz-stat-value">{quizStats.totalSubmissions}</span>
                            </div>
                            <div className="quiz-stat-item">
                              <span className="quiz-stat-label">Accuracy:</span>
                              <span className="quiz-stat-value">{quizStats.accuracyRate}%</span>
                            </div>
                          </div>
                          
                          <div className="pdf-previews-container">
                            {/* 使用Array.from创建页码数组，最多5页 */}
                            {Array.from({ length: Math.min(pdfPageCount, 5) }, (_, index) => (
                              <div key={`pdf-preview-${index}`} className="pdf-preview-item">
                                <div className="page-number">{index + 1}</div>
                                <PDFPreview
                                  url={getFileUrl(selectedUnit.reading_file)!}
                                  unitId={selectedUnit.id}
                                  unitTitle={selectedUnit.title}
                                  containerStyle="small"
                                  fileType="reading"
                                  className="preview-box clickable"
                                  onCustomClick={() => openPDFViewerAtPage(index + 1)}
                                  width={220}
                                  height={180}
                                  pageNumber={index + 1}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div 
                        className="story-text"
                        onMouseUp={handleTextSelection}
                      >
                      {selectedUnit?.story?.content && selectedUnit?.vocabulary ? 
                        highlightVocabulary(
                          selectedUnit.story.content, 
                          selectedUnit.vocabulary.map((v: any) => v.word)
                        ) : 
                        'No story display, please try to select unit from the dropdown above'
                      }
                      </div>

                      {/* PDF Viewer */}
                      {showPDFViewer && selectedUnit?.reading_file && (
                        <ReadingPDFViewer
                          url={getFileUrl(selectedUnit.reading_file)!}
                          isOpen={showPDFViewer}
                          onClose={() => setShowPDFViewer(false)}
                          initialPage={initialPdfPage}
                        />
                      )}
                    </div>
                  </div>

                  {/* Grammar Section - Slide 2 */}
                  <div className={`slide ${activeSlide === 1 ? 'active' : ''}`}>
                    <div className="grammar-section">
                      <div className="grammar-content">
                        {selectedUnit?.grammar?.map((item: any) => (
                          <div key={item.id} className="grammar-item">
                            <div className="grammar-original">
                              <div className="section-header">
                                <div className="header-left">
                                  <Quote size={34} />
                                  <h2>Grammar Point</h2>
                                </div>
                                
                                {/* Grammar Quiz Button */}
                                <button
                                  className="grammar-quiz-button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // 阻止事件冒泡
                                    setSelectedGrammarPoint(item);
                                    setShowGrammarQuiz(true);
                                  }}
                                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" 
                                    width="20" 
                                    height="20" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="#FFFFFF" 
                                    strokeWidth="1.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    className="lucide lucide-unicorn-head">
                                      <path d="m15.6 4.8 2.7 2.3"/>
                                      <path d="M15.5 10S19 7 22 2c-6 2-10 5-10 5"/>
                                      <path d="M11.5 12H11"/>
                                      <path d="M5 15a4 4 0 0 0 4 4h7.8l.3.3a3 3 0 0 0 4-4.46L12 7c0-3-1-5-1-5S8 3 8 7c-4 1-6 3-6 3"/>
                                      <path d="M2 4.5C4 3 6 3 6 3l2 4"/>
                                      <path d="M6.14 17.8S4 19 2 22"/>
                                  </svg>
                                  Grammar Quiz
                                </button>
                              </div>
                              <p>{item.grammar_original_text}</p>
                            </div>
                            
                            <div className="grammar-point">
                              <div className="section-header">
                                <Award size={20} />
                                <h3>Title</h3>
                              </div>
                              <p>{item.grammar_point}</p>
                            </div>

                            <div className="grammar-explanation">
                              <div className="section-header">
                                <MessageSquareQuote size={20} />
                                <h3>Explanation</h3>
                              </div>
                              <p>{item.explanation}</p>
                            </div>

                            <div className="grammar-example">
                              <div className="section-header">
                                <ListChecks size={20} />
                                <h3>Examples</h3>
                              </div>
                              <div className="example-list">
                                {item.example
                                  .replace(/[\[\]]/g, '')  // 移除方括号
                                  .split(/,(?!\s)|，/)     // 只在逗号后面不是空格的地方分割
                                  .map((example: any, i: number) => (
                                    <div key={i} className="example-item">
                                      {example.trim().replace(/['"]/g, '')}
                                    </div>
                                  ))}
                              </div>
                            </div>

                            <div className="grammar-exercise">
                              <div className="section-header">
                                <Pencil size={20} />
                                <h3>Exercises</h3>
                              </div>
                              <div className="exercise-list">
                                {item.exercise
                                  .replace(/[\[\]]/g, '')  // 移除方括号
                                  .split(/,(?!\s)|，/)     // 只在逗号后面不是空格的地方分割
                                  .map((exercise: any, i: number) => (
                                    <div key={i} className="exercise-item">
                                      {exercise.trim().replace(/['"]/g, '')}
                                    </div>
                                  ))}
                              </div>
                              <div className="solution">
                                <div className="section-header">
                                  <CheckCircle2 size={20} />
                                  <h4>Solution</h4>
                                </div>
                                <p>{item.solution}</p>
                              </div>
                            </div>

                            <div className="grammar-summary">
                              <div className="section-header">
                                <ListChecks size={20} />
                                <h3>Summary</h3>
                              </div>
                              <p>{item.summary}</p>
                            </div>
                          </div>
                        )) || (
                          <p className="no-content">No grammar points available</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stories Section - Slide 3 */}
                  <div className={`slide ${activeSlide === 2 ? 'active' : ''}`}>
                    <div className="stories-section">
                      <div className="stories-container">
                        {/* Card 1: Story Continues */}
                        <div className="story-card" style={{ backgroundColor: '#f8e4ff' }}>
                          <div className="card-image-container" style={{ backgroundColor: '#e5c1ff' }}>
                            <BookOpen size={48} color="#8d4bb9" />
                          </div>
                          <div className="card-content">
                            <h3 className="card-title">Story Continues...</h3>
                            <p className="card-description">Continue your learning journey with the next part of your current story.</p>
                            <div className="card-footer">
                              <div className="card-stats">
                                <div className="stat-item">
                                  <Book size={16} />
                                  <span>12 stories</span>
                                </div>
                                <div className="stat-item">
                                  <CheckCircle size={16} />
                                  <span>8 quizzes</span>
                                </div>
                                <div className="stat-item">
                                  <BarChart2 size={16} />
                                  <span>85% correct</span>
                                </div>
                              </div>
                              <div className="time-tag">
                                <Clock size={14} />
                                <span>15 min</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card 2: New Story */}
                        <div className="story-card" style={{ backgroundColor: '#e0f7ff' }}>
                          <div className="card-image-container" style={{ backgroundColor: '#b8e8ff' }}>
                            <FileText size={48} color="#0288d1" />
                          </div>
                          <div className="card-content">
                            <h3 className="card-title">New Story</h3>
                            <p className="card-description">Discover a brand new story with fresh vocabulary and grammar concepts.</p>
                            <div className="card-footer">
                              <div className="card-stats">
                                <div className="stat-item">
                                  <Book size={16} />
                                  <span>5 stories</span>
                                </div>
                                <div className="stat-item">
                                  <CheckCircle size={16} />
                                  <span>10 quizzes</span>
                                </div>
                                <div className="stat-item">
                                  <BarChart2 size={16} />
                                  <span>92% correct</span>
                                </div>
                              </div>
                              <div className="time-tag">
                                <Clock size={14} />
                                <span>20 min</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card 3: Brain Teasers */}
                        <div className="story-card" style={{ backgroundColor: '#fff0e0' }}>
                          <div className="card-image-container" style={{ backgroundColor: '#ffe0b2' }}>
                            <Brain size={48} color="#ed6c02" />
                          </div>
                          <div className="card-content">
                            <h3 className="card-title">Like a Brain Teaser?</h3>
                            <p className="card-description">Challenge yourself with fun puzzles that test your language skills.</p>
                            <div className="card-footer">
                              <div className="card-stats">
                                <div className="stat-item">
                                  <Brain size={16} />
                                  <span>8 puzzles</span>
                                </div>
                                <div className="stat-item">
                                  <CheckCircle size={16} />
                                  <span>15 quizzes</span>
                                </div>
                                <div className="stat-item">
                                  <BarChart2 size={16} />
                                  <span>78% correct</span>
                                </div>
                              </div>
                              <div className="time-tag">
                                <Clock size={14} />
                                <span>10 min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              </div>

              {/* 将指示器移到 slides 容器外部 */}
              <div className="slide-indicators">
                {[0, 1, 2].map((index) => (
                  <button
                    key={index}
                    className={`slide-indicator ${activeSlide === index ? 'active' : ''}`}
                    onClick={() => setActiveSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Vocabulary Section */}
            <div className="vocabulary-section">
              <div className="word-cloud">
                {selectedUnit?.vocabulary?.map((vocab: any) => (
                  <span 
                    key={vocab.word} 
                    className="word-tag" 
                    onClick={(e) => handleWordClick(vocab.word, e)}
                  >
                    {vocab.word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        
        
        {selectedWord && (
          <VocabPopover 
            curr_word={selectedWord.word}
            isLoading={selectedWord.isLoading}
            {...(selectedWord.details || {})}
            position={selectedWord.position}
            onClose={() => setSelectedWord(null)}
          />
        )}
        
        {selectedText && (
          <div 
            className="text-selection-popover"
            style={{
              position: 'fixed',
              left: selectedText.position.x,
              top: selectedText.position.y,
              transform: 'translateX(-50%) translateY(-100%)',
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
              zIndex: 1000,
              minWidth: '380px',
            }}
          >
            <div style={{ 
              backgroundColor: '#f5f5f5',
              padding: '1rem 0',
              borderRadius: '8px',
              fontSize: '1.8rem',
              color: 'rgb(100 92 156)'
            }}>
              {selectedText.text}
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '1rem' 
            }}>
              {/* 速度选择按钮组 - 左对齐 */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[
                  { id: 'very_slow', label: '0.5' },
                  { id: 'slow', label: '0.75' },
                  { id: 'normal', label: '1' }
                ].map(speed => (
                  <button
                    key={speed.id}
                    onClick={() => setReadingSpeed(speed.id as typeof readingSpeed)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      border: '1px solid #6B5ECD',
                      borderRadius: '4px',
                      background: readingSpeed === speed.id ? '#6B5ECD' : 'white',
                      color: readingSpeed === speed.id ? 'white' : '#6B5ECD',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {speed.label}
                  </button>
                ))}
              </div>

              {/* 播放/停止按钮 - 右对齐 */}
              {selectedText.isPlaying ? (
                <button 
                  onClick={handleStop}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.2rem',
                    background: '#6B5ECD',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                  }}
                >
                  <Square size={18} />
                  <span>Stop</span>
                </button>
              ) : (
                <button 
                  onClick={() => handlePlay()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.2rem',
                    background: '#6B5ECD',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                  }}
                >
                  <Play size={18} />
                  <span>Play</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setSelectedText(null)}
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                width: '24px',
                height: '24px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
      
      {/* Add Reading Quiz Modal */}
      {showReadingQuiz && selectedUnit?.story?.content && (
        <ReadingQuizModal
          isOpen={showReadingQuiz}
          onClose={() => setShowReadingQuiz(false)}
          storyContent={selectedUnit.story.content}
          unitId={selectedUnit.id}
          storyId={selectedUnit.story?.id}
        />
      )}

      {/* Grammar Quiz Modal */}
      {showGrammarQuiz && selectedGrammarPoint && (
        <GrammarQuizModal
          isOpen={showGrammarQuiz}
          onClose={() => setShowGrammarQuiz(false)}
          unitId={selectedUnit?.id || ''}
          grammarPoint={selectedGrammarPoint}
        />
      )}
    </div>
  );
};

