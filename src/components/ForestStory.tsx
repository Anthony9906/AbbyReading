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
  onQuizSubmit: (answers: any[]) => Promise<void>;
}

const ForestStory: React.FC<ForestStoryProps> = ({
  isOpen,
  onClose,
  isLoading,
  storyData,
  unitVocabulary,
  onQuizSubmit
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
  
  // 添加状态来跟踪所有测验答案
  const [quizAnswers, setQuizAnswers] = useState<{
    questionIndex: number;
    selectedOption: string;
    isCorrect: boolean;
  }[]>([]);
  
  // 添加状态来跟踪是否已提交所有答案
  const [allAnswersSubmitted, setAllAnswersSubmitted] = useState(false);
  
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
    // 如果当前页有测验问题且还没显示测验，则显示测验
    if (quizQuestions && quizQuestions[currentPage] && !showQuiz) {
      setShowQuiz(true);
      return; // 停止函数执行，不进入下一页
    }
    
    // 只有在没有当前页测验或已经回答正确的情况下才进入下一页
    if (currentPage < storyDialogues.length - 1) {
      setCurrentPage(currentPage + 1);
      setHighlightedWord(null);
      setShowQuiz(false);
      setCurrentQuizAnswer(null); // 重置测验答案
    } else {
      // 如果是最后一页，检查是否所有测验都已完成
      checkAllQuizzesCompleted();
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
    
    // 检查答案是否正确
    const currentQuestion = quizQuestions[currentPage];
    if (currentQuestion && index === currentQuestion.correctAnswer) {
      // 答案正确，延迟一会儿后自动进入下一页
      setTimeout(() => {
        if (currentPage < storyDialogues.length - 1) {
          setCurrentPage(currentPage + 1);
          setHighlightedWord(null);
          setShowQuiz(false);
          setCurrentQuizAnswer(null);
        } else {
          checkAllQuizzesCompleted();
        }
      }, 1000); // 延迟1秒后进入下一页
    } else {
      // 答案错误，显示错误提示（您需要在UI中添加相应的错误提示）
      // 这里可以添加震动效果或其他视觉反馈
    }
  };
  
  // 添加检查所有测验是否完成的函数
  const checkAllQuizzesCompleted = () => {
    // 检查是否所有测验都已回答
    if (quizQuestions && quizAnswers.length >= quizQuestions.length) {
      // 计算得分
      const correctAnswers = quizAnswers.filter(answer => answer.isCorrect).length;
      const score = (correctAnswers / quizQuestions.length) * 100;
      
      // 如果还没提交过，则提交答案
      if (!allAnswersSubmitted) {
        setAllAnswersSubmitted(true);
        
        // 调用父组件提供的onQuizSubmit函数提交答案
        onQuizSubmit(quizAnswers)
          .then(() => {
            toast.success(`Quiz completed! Your score: ${score.toFixed(0)}%`);
          })
          .catch(error => {
            console.error('Failed to submit quiz answers:', error);
            toast.error('Failed to save your quiz results. Please try again.');
            setAllAnswersSubmitted(false);
          });
      }
    }
  };
  
  // 在组件更新时检查是否所有测验都已完成
  useEffect(() => {
    if (quizQuestions && quizAnswers.length > 0) {
      checkAllQuizzesCompleted();
    }
  }, [quizAnswers, quizQuestions]);
  
  // 文本朗读功能
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8; // 稍微放慢速度，适合儿童
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
                        className={`fs-dialogue-row fs-dialogue-animate`}
                        style={{ 
                          animationDelay: `${0.1 * index}s`,
                          zIndex: 100 - index // 确保新对话显示在上层
                        }}
                      >
                        <div className="fs-character-avatar">
                          <div 
                            className={`fs-character-emoji-small ${index === visibleDialogues.length - 1 ? 'fs-speaking' : ''}`}
                            style={{ 
                              borderColor: dialogue.character.color,
                              animationDelay: `${0.2 * index}s`
                            }}
                            onClick={() => setSelectedCharacter(dialogue.character)}
                          >
                            <span role="img" aria-label={dialogue.character.species}>
                              {dialogue.character.emoji}
                            </span>
                          </div>
                          <span 
                            className="fs-character-name" 
                            style={{ 
                              backgroundColor: dialogue.character.color,
                              opacity: 0,
                              animation: `fs-fadeIn 0.5s ${0.3 * index}s forwards`
                            }}
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
                                      style={{
                                        animationDelay: `${0.03 * i + 0.5 * index}s`,
                                        opacity: 0,
                                        animation: `fs-fadeIn 0.3s ${0.03 * i + 0.5 * index}s forwards`
                                      }}
                                    >
                                      {word}{' '}
                                    </span>
                                  );
                                })}
                                <button 
                                  className="fs-speak-button"
                                  onClick={() => speakText(dialogue.text)}
                                  style={{
                                    opacity: 0,
                                    animation: `fs-fadeIn 0.5s ${0.5 * index + 1}s forwards`
                                  }}
                                >
                                  <Volume size={16} />
                                </button>
                              </p>
                              
                              {showTranslation && dialogue.translation && (
                                <p 
                                  className="fs-dialogue-translation"
                                  style={{
                                    opacity: 0,
                                    animation: `fs-fadeIn 0.5s ${0.5 * index + 1.2}s forwards`
                                  }}
                                >
                                  {dialogue.translation}
                                </p>
                              )}
                            </div>
                            
                            {dialogue.grammar && (
                              <div 
                                className="fs-grammar-tag"
                                style={{
                                  opacity: 0,
                                  animation: `fs-fadeIn 0.5s ${0.5 * index + 1.5}s forwards`
                                }}
                              >
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