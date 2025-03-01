"use client";

import { useState, useEffect } from 'react';
import { School, BookOpenCheck, BrainCircuit, Play, Square, MessageCircleMore, Quote, Pencil, CheckCircle2, ListChecks, MessageSquareQuote, Award, Book, CheckCircle, BarChart2, Clock, Brain, BookOpen, Eye, EyeOff, Music, Cat, MessageCircle, Bird, Squirrel, TentTree } from "lucide-react";
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
import { useAuth } from '../contexts/AuthContext';
import { generateStoryContinuation } from '../services/aiService';
import { saveStoryContinuation, saveQuizSubmission } from '../services/storyServices';
import { StoryContinueModal } from './StoryContinueModal';

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
  const [showStoryContinueModal, setShowStoryContinueModal] = useState(false);
  const [storyContinueContent, setStoryContinueContent] = useState(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [currentStoryContinueId, setCurrentStoryContinueId] = useState<string | null>(null);
  const { user } = useAuth();

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

  const handleStoryContinueClick = async () => {
    if (!selectedUnit || !selectedUnit.story || !user) return;
    
    setShowStoryContinueModal(true);
    setIsGeneratingStory(true);
    
    try {
      
      // 准备词汇列表
      const vocabulary = selectedUnit.vocabulary.map((v: any) => v.word);
      
      // 调用 AI 服务生成故事续写
      const response = await generateStoryContinuation({
        original_story: selectedUnit.story.content,
        unit_title: selectedUnit.title,
        vocabulary
      });
      
      // 安全解析 JSON 响应
      let parsedResponse;
      try {
        // 尝试直接解析
        parsedResponse = JSON.parse(response);
      } catch (parseError) {
        
        // 尝试清理响应并重新解析
        const cleanedResponse = cleanJsonResponse(response);
        try {
          parsedResponse = JSON.parse(cleanedResponse);
        } catch (secondParseError) {
          
          // 最后尝试使用正则表达式提取 JSON
          try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const extractedJson = jsonMatch[0];
              parsedResponse = JSON.parse(extractedJson);
            } else {
              throw new Error('Could not extract JSON from response');
            }
          } catch (thirdParseError) {
            console.error('All JSON parsing attempts failed:', thirdParseError);
            throw new Error('Failed to parse AI response. Please try again.');
          }
        }
      }
      
      // 验证解析后的响应包含所需字段
      if (!parsedResponse || 
          !parsedResponse.continued_story || 
          !Array.isArray(parsedResponse.used_vocabulary) || 
          !Array.isArray(parsedResponse.quiz)) {
        throw new Error('AI response is missing required fields');
      }
      
      // 确保 quiz 数据格式正确
      const validatedQuiz = parsedResponse.quiz.map((q: any, index: number) => {
        if (!q.question || !Array.isArray(q.options) || !q.answer || !q.explanation) {
          // 如果问题格式不正确，创建一个默认问题
          return {
            question: q.question || `Question ${index + 1} about the story`,
            options: Array.isArray(q.options) && q.options.length >= 3 
              ? q.options 
              : ['Option A', 'Option B', 'Option C'],
            answer: q.answer || 'Option A',
            explanation: q.explanation || 'This is the correct answer based on the story.'
          };
        }
        return q;
      });
      
      // 创建验证后的响应对象
      const validatedResponse = {
        continued_story: parsedResponse.continued_story,
        used_vocabulary: Array.isArray(parsedResponse.used_vocabulary) 
          ? parsedResponse.used_vocabulary 
          : [],
        quiz: validatedQuiz
      };
      
      // 保存到数据库
      const savedStory = await saveStoryContinuation({
        user_id: user.id,
        unit_id: selectedUnit.id,
        continued_story: validatedResponse.continued_story,
        used_vocabulary: validatedResponse.used_vocabulary,
        quiz_data: validatedResponse.quiz
      });
      
      setCurrentStoryContinueId(savedStory.id);
      setStoryContinueContent(validatedResponse);
    } catch (error) {
      console.error('Error generating story continuation:', error);
      toast.error('Failed to generate story. Please try again.');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  // 辅助函数：清理 JSON 响应
  const cleanJsonResponse = (response: string): string => {
    // 移除可能的前缀（如 "```json" 或其他非 JSON 文本）
    let cleaned = response.trim();
    
    // 检查并移除 Markdown 代码块标记
    if (cleaned.startsWith("```")) {
      // 找到第一个换行符
      const firstNewline = cleaned.indexOf('\n');
      if (firstNewline !== -1) {
        // 移除第一行（```json 或类似内容）
        cleaned = cleaned.substring(firstNewline + 1);
      }
      
      // 移除结尾的 ``` 标记
      const endMarkdown = cleaned.lastIndexOf("```");
      if (endMarkdown !== -1) {
        cleaned = cleaned.substring(0, endMarkdown).trim();
      }
    }
    
    // 移除可能的代码块标记后，再次查找 JSON 对象的开始和结束
    const jsonStartIndex = cleaned.indexOf('{');
    const jsonEndIndex = cleaned.lastIndexOf('}');
    
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      cleaned = cleaned.substring(jsonStartIndex, jsonEndIndex + 1);
    }
    
    // 修复常见的 JSON 格式问题
    // 1. 将单引号替换为双引号
    cleaned = cleaned.replace(/'/g, '"');
    
    // 2. 修复没有引号的键
    cleaned = cleaned.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    
    // 3. 移除尾随逗号
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
    
    // 4. 修复可能的换行问题
    cleaned = cleaned.replace(/\n/g, ' ');
    
    // 5. 修复可能的转义问题
    cleaned = cleaned.replace(/\\/g, '\\\\');
    
    // 6. 修复双引号内的双引号
    let inString = false;
    let result = '';
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (char === '"') {
        // 检查是否是转义的引号
        if (i > 0 && cleaned[i-1] === '\\') {
          result += char;
        } else {
          inString = !inString;
          result += char;
        }
      } else if (char === '"' && inString) {
        // 在字符串内部的双引号，应该被转义
        result += '\\"';
      } else {
        result += char;
      }
    }
    
    console.log("Cleaned JSON:", cleaned);
    return cleaned;
  };

  // 辅助函数：从故事中提取角色（简化版）
  const extractCharactersFromStory = (storyContent: string) => {
    // 这是一个简化的实现，实际应用中可能需要更复杂的逻辑
    // 例如使用NLP或者预定义的角色列表
    const words = storyContent.split(/\s+/);
    const potentialCharacters = words
      .filter(word => word.length > 1 && /^[A-Z]/.test(word))
      .filter(word => !['I', 'The', 'A', 'An', 'In', 'On', 'At', 'To', 'And'].includes(word));
    
    // 去重并限制数量
    return [...new Set(potentialCharacters)].slice(0, 5);
  };

  // 处理问答提交
  const handleQuizSubmission = async (answers: any[]) => {
    if (!user || !currentStoryContinueId) return;
    
    try {
      // 计算得分
      const correctAnswers = answers.filter(a => a.isCorrect).length;
      const score = Math.round((correctAnswers / answers.length) * 100);
      
      // 保存提交结果
      await saveQuizSubmission({
        story_continue_id: currentStoryContinueId,
        user_id: user.id,
        answers,
        score
      });
    } catch (error) {
      console.error('Error saving quiz submission:', error);
    }
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
                      <div className="story-grid">
                        {/* Card 1: Story Continues */}
                        <div 
                          className="story-item" 
                          style={{ backgroundColor: '#f8e4ff' }}
                          onClick={handleStoryContinueClick}
                        >
                          <div className="story-item__image-wrapper" style={{ backgroundColor: '#e5c1ff' }}>
                            <div className="story-item__glow-effect" style={{ backgroundColor: '#e5c1ff' }}></div>
                            <Bird size={48} color="#8d4bb9" />
                          </div>
                          <div className="story-item__content">
                            <h3 className="story-item__title">Story Continues...</h3>
                            <p className="story-item__description">Continue your learning journey with the next part of your current story.</p>
                            <div className="story-item__footer">
                              <div className="story-item__metrics">
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <Book size={16} />
                                  </div>
                                  <span>12 stories</span>
                                </div>
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <CheckCircle size={16} />
                                  </div>
                                  <span>8 quizzes</span>
                                </div>
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <BarChart2 size={16} />
                                  </div>
                                  <span>85% correct</span>
                                </div>
                              </div>
                              <div className="story-item__duration">
                                <Clock size={14} />
                                <span>15 min</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card 2: New Story */}
                        <div className="story-item" style={{ backgroundColor: '#b1dae2' }}>
                          <div className="story-item__image-wrapper" style={{ backgroundColor: '#b8e8ff' }}>
                            <div className="story-item__glow-effect" style={{ backgroundColor: '#b8e8ff' }}></div>
                            <Squirrel size={48} color="#158594" />
                          </div>
                          <div className="story-item__content">
                            <h3 className="story-item__title">New Story</h3>
                            <p className="story-item__description">Discover a brand new story with fresh vocabulary and grammar concepts.</p>
                            <div className="story-item__footer">
                              <div className="story-item__metrics">
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <Book size={16} />
                                  </div>
                                  <span>5 stories</span>
                                </div>
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <CheckCircle size={16} />
                                  </div>
                                  <span>10 quizzes</span>
                                </div>
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <BarChart2 size={16} />
                                  </div>
                                  <span>92% correct</span>
                                </div>
                              </div>
                              <div className="story-item__duration">
                                <Clock size={14} />
                                <span>20 min</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card 3: Brain Teasers */}
                        <div className="story-item" style={{ backgroundColor: '#fff0e0' }}>
                          <div className="story-item__image-wrapper" style={{ backgroundColor: '#ffe0b2' }}>
                            <div className="story-item__glow-effect" style={{ backgroundColor: '#ffe0b2' }}></div>
                            <Brain size={48} color="#ed6c02" />
                          </div>
                          <div className="story-item__content">
                            <h3 className="story-item__title">Like a Brain Teaser?</h3>
                            <p className="story-item__description">Challenge yourself with fun puzzles that test your language skills.</p>
                            <div className="story-item__footer">
                              <div className="story-item__metrics">
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <Brain size={16} />
                                  </div>
                                  <span>8 puzzles</span>
                                </div>
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <CheckCircle size={16} />
                                  </div>
                                  <span>15 quizzes</span>
                                </div>
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <BarChart2 size={16} />
                                  </div>
                                  <span>78% correct</span>
                                </div>
                              </div>
                              <div className="story-item__duration">
                                <Clock size={14} />
                                <span>10 min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Card 4: Play a Music */}
                        <div className="story-item" style={{ backgroundColor: '#e8f5e9' }}>
                          <div className="story-item__image-wrapper" style={{ backgroundColor: '#c8e6c9' }}>
                            <div className="story-item__glow-effect" style={{ backgroundColor: '#c8e6c9' }}></div>
                            <Music size={48} color="#2e7d32" />
                          </div>
                          <div className="story-item__content">
                            <h3 className="story-item__title">Play a Music</h3>
                            <p className="story-item__description">Learn language through music and songs with lyrics that reinforce vocabulary.</p>
                            <div className="story-item__footer">
                              <div className="story-item__metrics">
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <Music size={16} />
                                  </div>
                                  <span>7 songs</span>
                                </div>
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <CheckCircle size={16} />
                                  </div>
                                  <span>12 quizzes</span>
                                </div>
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <BarChart2 size={16} />
                                  </div>
                                  <span>88% correct</span>
                                </div>
                              </div>
                              <div className="story-item__duration">
                                <Clock size={14} />
                                <span>18 min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Card 5: Comic Books */}
                        <div className="story-item" style={{ backgroundColor: '#ffebee' }}>
                          <div className="story-item__image-wrapper" style={{ backgroundColor: '#ffcdd2' }}>
                            <div className="story-item__glow-effect" style={{ backgroundColor: '#ffcdd2' }}></div>
                            <TentTree size={48} color="#c62828" />
                          </div>
                          <div className="story-item__content">
                            <h3 className="story-item__title">Comic Books</h3>
                            <p className="story-item__description">Learn through visual storytelling with fun comics that make vocabulary memorable.</p>
                            <div className="story-item__footer">
                              <div className="story-item__metrics">
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <BookOpen size={16} />
                                  </div>
                                  <span>9 comics</span>
                                </div>
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <CheckCircle size={16} />
                                  </div>
                                  <span>14 quizzes</span>
                                </div>
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <BarChart2 size={16} />
                                  </div>
                                  <span>82% correct</span>
                                </div>
                              </div>
                              <div className="story-item__duration">
                                <Clock size={14} />
                                <span>25 min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Card 6: Talk with Cat */}
                        <div className="story-item" style={{ backgroundColor: 'rgb(166 213 251)' }}>
                          <div className="story-item__image-wrapper" style={{ backgroundColor: '#bbdefb' }}>
                            <div className="story-item__glow-effect" style={{ backgroundColor: '#bbdefb' }}></div>
                            <Cat size={48} color="#1565c0" />
                          </div>
                          <div className="story-item__content">
                            <h3 className="story-item__title">Talk with Cat</h3>
                            <p className="story-item__description">Practice conversation skills with an AI cat that responds to your language learning.</p>
                            <div className="story-item__footer">
                              <div className="story-item__metrics">
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <MessageCircle size={16} />
                                  </div>
                                  <span>20 topics</span>
                                </div>
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <CheckCircle size={16} />
                                  </div>
                                  <span>8 quizzes</span>
                                </div>
                                <div className="story-item__metric">
                                  <div className="story-item__metric-icon">
                                    <BarChart2 size={16} />
                                  </div>
                                  <span>90% correct</span>
                                </div>
                              </div>
                              <div className="story-item__duration">
                                <Clock size={14} />
                                <span>15 min</span>
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

      {showStoryContinueModal && (
        <StoryContinueModal
          isOpen={showStoryContinueModal}
          onClose={() => setShowStoryContinueModal(false)}
          storyContent={storyContinueContent}
          onSubmitAnswers={handleQuizSubmission}
          isLoading={isGeneratingStory}
        />
      )}
    </div>
  );
};

