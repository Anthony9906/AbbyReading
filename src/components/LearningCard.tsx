"use client";

import { useState, useEffect } from 'react';
import { School, BookOpenCheck, BrainCircuit } from "lucide-react";
import { supabase } from '../lib/supabase';
import '../styles/components/LearningCard.css';
import { VocabPopover } from './VocabPopover';
import OpenAI from 'openai';
import { toast } from 'react-hot-toast';
import { TextSelectionPopover } from './TextSelectionPopover';

interface Unit {
  id: string;
  title: string;
  story?: {
    content: string;
  };
  vocabulary?: Array<{
    word: string;
    chinese_definition: string;
  }>;
}

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

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_WILDCARD_API_KEY,
  baseURL: import.meta.env.VITE_OPENAI_WILDCARD_BASE_URL,
  dangerouslyAllowBrowser: true // 允许在浏览器中使用
});

export const LearningCard = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordSelection | null>(null);
  const [selectedText, setSelectedText] = useState<{
    text: string;
    position: { x: number; y: number };
    isPlaying: boolean;
  } | null>(null);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('units')
        .select(`
          id,
          title,
          stories (
            content,
            type
          ),
          vocabulary (
            word,
            chinese_definition
          )
        `)
        .eq('user_id', user?.id)
        .not('stories', 'is', null)
        .not('vocabulary', 'is', null);

      if (error) throw error;

      const processedUnits = data
        .map(unit => ({
          ...unit,
          story: unit.stories?.find(s => s.type === 'inclass'),
          vocabulary: unit.vocabulary
        }))
        .filter(unit => unit.story && unit.vocabulary?.length > 0);

      setUnits(processedUnits);
      if (processedUnits.length > 0) {
        setSelectedUnit(processedUnits[0]);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const handleUnitChange = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
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
      const matches = [...paragraph.matchAll(regex)];
      let lastIndex = 0;
      const parts = [];
      
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
      
      return <p key={index}>{parts}</p>;
    });
  };

  // 添加点击外部关闭气泡的处理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedWord && 
          !((event.target as Element).closest('.vocab-popover') || 
            (event.target as Element).closest('.highlight') ||
            (event.target as Element).closest('.word-tag'))) {
        setSelectedWord(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedWord]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    console.log('Selection event triggered', selection?.toString());
    
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      console.log('Setting selected text', {
        text,
        position: {
          x: rect.left + (rect.width / 2),
          y: rect.top,
        }
      });
      
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

  const handlePlay = async () => {
    if (!selectedText) return;

    setSelectedText(prev => prev ? { ...prev, isPlaying: true } : null);

    try {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "echo",
        input: selectedText.text,
      });

      const blob = await mp3.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setSelectedText(prev => prev ? { ...prev, isPlaying: false } : null);
      };

      await audio.play();
    } catch (error) {
      console.error('Error with OpenAI TTS:', error);
      toast.error('Failed to play audio. Please try again.');
      setSelectedText(prev => prev ? { ...prev, isPlaying: false } : null);
    }
  };

  const handleStop = () => {
    // 可以在这里添加停止播放的逻辑
    setSelectedText(prev => prev ? { ...prev, isPlaying: false } : null);
  };

  // 添加点击外部关闭气泡的处理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedText && 
          !((event.target as Element).closest('.text-selection-popover'))) {
        setSelectedText(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedText]);

  return (
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
              {units.map(unit => (
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
          {/* Reading Section */}
          <div className="reading-section">
            <div 
              className="story-text"
              onMouseUp={handleTextSelection}
            >
              {selectedUnit?.story?.content && selectedUnit?.vocabulary ? 
                highlightVocabulary(
                  selectedUnit.story.content, 
                  selectedUnit.vocabulary.map(v => v.word)
                ) : 
                'No story available'
              }
            </div>
            <div className="tag reading">Reading</div>
          </div>

          {/* Vocabulary Section */}
          <div className="vocabulary-section">
            <div className="word-cloud">
              {selectedUnit?.vocabulary?.map((vocab) => (
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

      {/* 底部按钮组 */}
      <div className="action-buttons">
        <button className="action-button school">
          <School className="button-icon" />
          <span>In School</span>
        </button>
        <button className="action-button reading">
          <BookOpenCheck className="button-icon" />
          <span>AI Reading</span>
        </button>
        <button className="action-button quiz">
          <BrainCircuit className="button-icon" />
          <span>Small Quiz</span>
        </button>
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
        <div style={{ position: 'fixed', top: 0, left: 0, background: 'red', padding: '10px', zIndex: 9999 }}>
          Debug: Text selected
        </div>
      )}
      
      {selectedText && (
        <TextSelectionPopover
          text={selectedText.text}
          position={selectedText.position}
          isPlaying={selectedText.isPlaying}
          onClose={() => setSelectedText(null)}
          onPlay={handlePlay}
          onStop={handleStop}
        />
      )}
    </div>
  );
};

