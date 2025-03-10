import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Volume2, Loader, Headphones } from 'lucide-react';
import { speakWithOpenAI } from '../services/speechService';
import '../styles/components/StoryContinueModal.css';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface StoryContinueModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyContent: {
    continued_story: string;
    used_vocabulary: string[];
    quiz: QuizQuestion[];
  } | null;
  onSubmitAnswers: (answers: {
    questionIndex: number;
    selectedOption: string;
    isCorrect: boolean;
  }[]) => void;
  isLoading: boolean;
}

export const StoryContinueModal: React.FC<StoryContinueModalProps> = ({
  isOpen,
  onClose,
  storyContent,
  onSubmitAnswers,
  isLoading
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [currentView, setCurrentView] = useState<'story' | 'quiz'>('story');
  
  // 音频朗读相关状态
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    if (storyContent) {
      setSelectedAnswers(Array(storyContent.quiz.length).fill(null));
      setShowResults(false);
      setCurrentView('story');
    }
  }, [storyContent]);

  if (!isOpen) return null;

  const handleOptionSelect = (questionIndex: number, option: string) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[questionIndex] = option;
    setSelectedAnswers(newAnswers);
  };

  const handleSubmit = () => {
    if (!storyContent) return;
    
    const results = selectedAnswers.map((selected, index) => ({
      questionIndex: index,
      selectedOption: selected || '',
      isCorrect: selected === storyContent.quiz[index].answer
    }));
    
    onSubmitAnswers(results);
    setShowResults(true);
  };

  const calculateScore = () => {
    if (!storyContent) return 0;
    
    const correctAnswers = selectedAnswers.filter(
      (selected, index) => selected === storyContent.quiz[index].answer
    ).length;
    
    return Math.round((correctAnswers / storyContent.quiz.length) * 100);
  };

  // 处理文本选择
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString().trim());
    }
  };

  // 播放选中文本
  const handlePlayAudio = async () => {
    if (!selectedText) return;
    
    try {
      setIsPlayingAudio(true);
      await speakWithOpenAI(selectedText);
    } catch (error) {
      console.error('Error speaking text:', error);
      alert('Failed to generate speech. Please try again.');
    } finally {
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="sc-modal-overlay">
      <div className="sc-modal">
        <div className="sc-modal-header">
          <h2>{currentView === 'story' ? 'Story Continues...' : 'Reading Comprehension Quiz'}</h2>
          <button className="sc-close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        {isLoading ? (
          <div className="sc-loading">
            <div className="sc-spinner"></div>
            <p>Creating your story adventure...</p>
          </div>
        ) : (
          <>
            <div className="sc-modal-tabs">
              <button 
                className={`sc-tab-button ${currentView === 'story' ? 'active' : ''}`}
                onClick={() => setCurrentView('story')}
              >
                Story
              </button>
              <button 
                className={`sc-tab-button ${currentView === 'quiz' ? 'active' : ''}`}
                onClick={() => setCurrentView('quiz')}
              >
                Quiz
              </button>
            </div>
            
            <div className="sc-modal-content">
              {currentView === 'story' && storyContent && (
                <div className="sc-story-content">
                  {/* 优化的文本选择提示 */}
                  <div className="sc-text-selection-hint">
                    <Headphones size={20} className="sc-hint-icon" />
                    <p>Select any words to hear them read aloud!</p>
                  </div>
                  
                  {/* 显示选中文本的音频控制按钮 */}
                  {selectedText && (
                    <div className="sc-audio-controls">
                      <div className="sc-selected-text">
                        <p>"{selectedText}"</p>
                      </div>
                      <button 
                        className="sc-play-button"
                        onClick={handlePlayAudio}
                        disabled={isPlayingAudio}
                      >
                        {isPlayingAudio ? (
                          <Loader size={20} className="sc-loading-icon" />
                        ) : (
                          <Volume2 size={20} />
                        )}
                        {isPlayingAudio ? 'Generating audio...' : 'Read aloud'}
                      </button>
                    </div>
                  )}
                  
                  <div 
                    className="sc-story-text"
                    onMouseUp={handleTextSelection}
                  >
                    {storyContent.continued_story.split('\n').map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                  
                  <div className="sc-vocabulary-used">
                    <h3>Vocabulary Used:</h3>
                    <div className="sc-vocabulary-tags">
                      {storyContent.used_vocabulary.map((word, i) => (
                        <span key={i} className="sc-vocabulary-tag">{word}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {currentView === 'quiz' && storyContent && (
                <div className="sc-quiz-content">
                  {showResults && (
                    <div className="sc-quiz-results">
                      <div className="sc-quiz-score">
                        <h3>Your Score: {calculateScore()}%</h3>
                      </div>
                    </div>
                  )}
                  
                  {storyContent.quiz.map((question, qIndex) => (
                    <div key={qIndex} className="sc-quiz-question">
                      <h3>Question {qIndex + 1}</h3>
                      <p>{question.question}</p>
                      
                      <div className="sc-quiz-options">
                        {question.options.map((option, oIndex) => (
                          <div 
                            key={oIndex} 
                            className={`sc-quiz-option ${selectedAnswers[qIndex] === option ? 'selected' : ''} ${
                              showResults 
                                ? option === question.answer 
                                  ? 'correct' 
                                  : selectedAnswers[qIndex] === option 
                                    ? 'incorrect' 
                                    : ''
                                : ''
                            }`}
                            onClick={() => !showResults && handleOptionSelect(qIndex, option)}
                          >
                            <span className="sc-option-letter">{String.fromCharCode(65 + oIndex)}</span>
                            <span className="sc-option-text">{option}</span>
                            {showResults && option === question.answer && (
                              <CheckCircle size={20} className="sc-result-icon correct" />
                            )}
                            {showResults && selectedAnswers[qIndex] === option && option !== question.answer && (
                              <AlertCircle size={20} className="sc-result-icon incorrect" />
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {showResults && (
                        <div className="sc-explanation">
                          <h4>Explanation:</h4>
                          <p>{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {!showResults && (
                    <button 
                      className="sc-submit-button"
                      onClick={handleSubmit}
                      disabled={selectedAnswers.some(answer => answer === null)}
                    >
                      Submit Answers
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}; 