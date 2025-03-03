import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Volume } from 'lucide-react';
import { toast } from 'react-hot-toast';
import '../styles/components/ForestStory.css';

interface ForestStoryProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  storyData: {
    dialogues: any[][];
    quizQuestions: any[];
    unitTitle: string;
  } | null;
  unitVocabulary: any[];
  unitGrammar: any[];
}

const ForestStory: React.FC<ForestStoryProps> = ({
  isOpen,
  onClose,
  isLoading,
  storyData,
  unitVocabulary,
  unitGrammar
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuizAnswer, setCurrentQuizAnswer] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<any | null>(null);
  const [visibleDialogues, setVisibleDialogues] = useState<number[]>([]);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  
  // 使用传入的 storyData
  const [storyDialogues, setStoryDialogues] = useState<any[][]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  
  // 初始化数据
  useEffect(() => {
    if (isOpen && storyData) {
      setStoryDialogues(storyData.dialogues || []);
      setQuizQuestions(storyData.quizQuestions || []);
      setCurrentPage(0);
      setShowQuiz(false);
      setCurrentQuizAnswer(null);
      setShowTranslation(false);
      setHighlightedWord(null);
      setSelectedCharacter(null);
      setVisibleDialogues([]);
      setQuizAnswered(false);
    }
  }, [isOpen, storyData]);
  
  // 在页面变化时重置可见对话
  useEffect(() => {
    if (!isLoading && storyDialogues && storyDialogues[currentPage]) {
      setVisibleDialogues([]);
      
      // 逐个显示对话
      storyDialogues[currentPage].forEach((_, index: number) => {
        setTimeout(() => {
          setVisibleDialogues(prev => [...prev, index]);
        }, 1000 * index); // 每个对话间隔1秒显示
      });
    }
  }, [currentPage, isLoading, storyDialogues]);
  
  // 修改 nextPage 函数
  const nextPage = () => {
    if (showQuiz) {
      // 如果当前显示的是测验，进入下一页
      setShowQuiz(false);
      setCurrentQuizAnswer(null);
      if (currentPage < storyDialogues.length - 1) {
        setCurrentPage(currentPage + 1);
      }
    } else {
      // 如果当前显示的是对话，切换到测验
      setShowQuiz(true);
    }
  };
  
  // 修改 prevPage 函数
  const prevPage = () => {
    if (showQuiz) {
      // 如果当前显示的是测验，返回到对话
      setShowQuiz(false);
    } else {
      // 如果当前显示的是对话，返回上一页
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
        setCurrentQuizAnswer(null);
      }
    }
  };
  
  // 处理单词点击
  const handleWordClick = (word: string) => {
    setHighlightedWord(word);
  };
  
  // 修改 handleQuizAnswer 函数
  const handleQuizAnswer = (index: number) => {
    setCurrentQuizAnswer(index.toString());
    
    // 获取当前页面的测验
    const currentQuiz = quizQuestions[currentPage];
    
    if (currentQuiz && index === currentQuiz.correctAnswer) {
      toast.success('Correct! Well done!');
      setQuizAnswered(true);
      
      // 答对后，延迟一秒自动进入下一页
      setTimeout(() => {
        setShowQuiz(false);
        setCurrentQuizAnswer(null);
        if (currentPage < storyDialogues.length - 1) {
          setCurrentPage(currentPage + 1);
        }
        setQuizAnswered(false);
      }, 1000);
    } else {
      toast.error('Not quite right. Try again!');
      // 答错后，延迟清除选择，让用户重新尝试
      setTimeout(() => {
        setCurrentQuizAnswer(null);
      }, 1000);
    }
  };
  
  // 文本朗读功能
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // 稍微放慢速度，适合儿童
      utterance.pitch = 1.1; // 稍微提高音调，更适合儿童
      window.speechSynthesis.speak(utterance);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fs-overlay">
      <div className="fs-container">
        <div className="fs-header">
          <div className="fs-header-left">
            <h2>Forest Friends: {storyData?.unitTitle}</h2>
          </div>
          
          {/* 将角色头像移到 header 上 */}
          <div className="fs-header-characters">
            {storyDialogues && storyDialogues[currentPage] && storyDialogues[currentPage].map((dialogue: any, index: number) => (
              dialogue && dialogue.character && visibleDialogues.includes(index) && (
                <div 
                  key={`header-${index}`}
                  className="fs-header-character"
                  onClick={() => setSelectedCharacter(dialogue.character)}
                >
                  <div 
                    className="fs-character-emoji-header"
                    style={{ borderColor: dialogue.character.color }}
                  >
                    <span role="img" aria-label={dialogue.character.species}>
                      {dialogue.character.emoji}
                    </span>
                  </div>
                </div>
              )
            ))}
          </div>
          
          <button className="fs-close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="fs-content">
          {isLoading ? (
            <div className="fs-loading-container">
              <div className="fs-loading-spinner"></div>
              <p>Creating a magical forest story...</p>
            </div>
          ) : (
            <>
              {/* 背景图覆盖整个内容区域 */}
              <div className="fs-background">
                <img src="/images/forest-background.jpeg" alt="Forest scene" />
                <div className="fs-mask"></div>
              </div>
              
              <div className="fs-scene">
                <div className="fs-dialogue-container">
                  {storyDialogues && storyDialogues[currentPage] && storyDialogues[currentPage].map((dialogue: any, index: number) => (
                    dialogue && dialogue.character && visibleDialogues.includes(index) && (
                      <div 
                        key={index}
                        className="fs-dialogue-row fs-dialogue-animate"
                      >
                        <div className="fs-character-avatar">
                          <div 
                            className="fs-character-emoji-small"
                            style={{ borderColor: dialogue.character.color }}
                          >
                            <span role="img" aria-label={dialogue.character.species}>
                              {dialogue.character.emoji}
                            </span>
                          </div>
                          <span 
                            className="fs-character-name" 
                            style={{ backgroundColor: dialogue.character.color }}
                          >
                            {dialogue.character.name}
                          </span>
                        </div>
                        
                        <div className="fs-dialogue-bubble-container">
                          <div 
                            className="fs-dialogue-bubble"
                            style={{ 
                              borderColor: dialogue.character.color,
                              backdropFilter: 'blur(8px)'
                            }}
                          >
                            <div className="fs-dialogue-content">
                              <p className="fs-dialogue-text">
                                {dialogue.text && dialogue.text.split(' ').map((word: string, i: number) => {
                                  // 清理单词（移除标点符号）
                                  const cleanWord = word.replace(/[.,!?;:]/g, '');
                                  // 检查是否是单元词汇
                                  const isVocabWord = unitVocabulary && unitVocabulary.some(
                                    (v: any) => v.word && v.word.toLowerCase() === cleanWord.toLowerCase()
                                  );
                                  
                                  return (
                                    <span 
                                      key={i}
                                      className={`fs-dialogue-word ${isVocabWord ? 'fs-vocab-word' : ''}`}
                                      onClick={() => isVocabWord && handleWordClick(cleanWord)}
                                    >
                                      {word}{' '}
                                    </span>
                                  );
                                })}
                                <button 
                                  className="fs-speak-button"
                                  onClick={() => speakText(dialogue.text)}
                                >
                                  <Volume size={16} />
                                </button>
                              </p>
                              
                              {showTranslation && dialogue.translation && (
                                <p className="fs-dialogue-translation">
                                  {dialogue.translation}
                                </p>
                              )}
                            </div>
                            
                            {dialogue.grammar && (
                              <div className="fs-grammar-tag">
                                {dialogue.grammar}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
                
                {/* 测验部分 */}
                {showQuiz && quizQuestions && quizQuestions[currentPage] && (
                  <div className="fs-quiz">
                    <h3>Let's Check What You Learned!</h3>
                    <p>{quizQuestions[currentPage].question}</p>
                    
                    <div className="fs-quiz-options">
                      {quizQuestions[currentPage].options.map((option: string, index: number) => {
                        const isSelected = currentQuizAnswer === index.toString();
                        const isCorrect = index === quizQuestions[currentPage].correctAnswer;
                        let className = "fs-quiz-option";
                        
                        if (isSelected) {
                          className += " selected";
                          if (isCorrect) {
                            className += " correct";
                          } else {
                            className += " incorrect";
                          }
                        }
                        
                        return (
                          <button 
                            key={index}
                            className={className}
                            onClick={() => handleQuizAnswer(index)}
                            disabled={quizAnswered || (isSelected && !isCorrect)}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 单词解释弹窗 */}
              {highlightedWord && (
                <div className="fs-word-explanation">
                  <h4>{highlightedWord}</h4>
                  <p>{unitVocabulary.find((v: any) => 
                    v.word.toLowerCase() === highlightedWord.toLowerCase()
                  )?.definition || 'No definition available'}</p>
                  <button onClick={() => setHighlightedWord(null)}>Close</button>
                </div>
              )}
              
              {/* 角色信息弹窗 */}
              {selectedCharacter && (
                <div className="fs-character-info-modal">
                  <div className="fs-character-info-content">
                    <button className="fs-close-info-button" onClick={() => setSelectedCharacter(null)}>
                      <X size={16} />
                    </button>
                    <div 
                      className="fs-character-emoji-large"
                      style={{ borderColor: selectedCharacter.color }}
                    >
                      <span role="img" aria-label={selectedCharacter.species}>
                        {selectedCharacter.emoji}
                      </span>
                    </div>
                    <h3 style={{ color: selectedCharacter.color }}>{selectedCharacter.name}</h3>
                    <p><strong>Species:</strong> {selectedCharacter.species}</p>
                    <p><strong>Personality:</strong> {selectedCharacter.personality}</p>
                    <p><strong>Language Style:</strong> {selectedCharacter.description}</p>
                  </div>
                </div>
              )}
              
              {/* 底部导航栏浮动在背景图上 */}
              <div className="fs-footer">
                <div className="fs-controls">
                  <button 
                    className="fs-nav-button"
                    onClick={prevPage}
                    disabled={currentPage === 0 && !showQuiz}
                  >
                    <ChevronLeft size={20} />
                    Previous
                  </button>
                  
                  <button 
                    className="fs-translation-toggle"
                    onClick={() => setShowTranslation(!showTranslation)}
                  >
                    {showTranslation ? 'Hide Translation' : 'Show Translation'}
                  </button>
                  
                  <button 
                    className="fs-nav-button"
                    onClick={nextPage}
                    disabled={currentPage === storyDialogues.length - 1 && showQuiz}
                  >
                    Next
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForestStory; 