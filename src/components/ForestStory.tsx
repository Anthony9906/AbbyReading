import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Volume } from 'lucide-react';
import { toast } from 'react-hot-toast';
import '../styles/components/ForestStory.css';
import { generateForestStory } from '../services/aiService';

interface ForestStoryProps {
  isOpen: boolean;
  onClose: () => void;
  unitVocabulary: any[];
  unitGrammar: any[];
  unitTitle: string;
}

const ForestStory: React.FC<ForestStoryProps> = ({
  isOpen,
  onClose,
  unitVocabulary,
  unitGrammar,
  unitTitle
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQuizAnswer, setCurrentQuizAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storyDialogues, setStoryDialogues] = useState<any[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [visibleDialogues, setVisibleDialogues] = useState<number[]>([]);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationAttempts, setGenerationAttempts] = useState(0);
  const maxAttempts = 2; // 最大尝试次数
  
  // 动物角色定义
  const characters = [
    {
      id: 'owl',
      name: "Professor Hoot",
      species: "Owl",
      personality: "Wise and patient",
      emoji: "🦉",
      color: "#6f4d2e",
      description: "Uses complex grammar and explains things"
    },
    {
      id: 'squirrel',
      name: "Lily",
      species: "Squirrel",
      personality: "Energetic and cheerful",
      emoji: "🐿️",
      color: "#c54c4c",
      description: "Speaks quickly and uses many adjectives and exclamations"
    },
    {
      id: 'turtle',
      name: "Grandpa Shell",
      species: "Turtle",
      personality: "Slow but thoughtful",
      emoji: "🐢",
      color: "#2E8B57",
      description: "Uses simple sentence structures with profound meanings"
    },
    {
      id: 'cat',
      name: "Whiskers",
      species: "Cat",
      personality: "Curious and playful",
      emoji: "🐱",
      color: "#9370DB",
      description: "Always asks questions and explores new vocabulary"
    },
    {
      id: 'fox',
      name: "Fiona",
      species: "Fox",
      personality: "Kind and helpful",
      emoji: "🦊",
      color: "#e46618",
      description: "Uses polite language and suggestion sentence patterns"
    },
    {
      id: 'unicorn',
      name: "Sparkle",
      species: "Unicorn",
      personality: "Magical and inspiring",
      emoji: "🦄",
      color: "#FF69B4",
      description: "Uses colorful expressions and encourages imagination"
    }
  ];
  
  // 生成故事对话
  useEffect(() => {
    if (isOpen && !isGenerating && generationAttempts === 0) {
      console.log("generating forest story in useEffect");
      generateStory();
    }
    
    // 清理函数
    return () => {
      // 如果组件卸载，不做任何操作
    };
  }, [isOpen]); // 只在 isOpen 变化时触发
  
  // 添加 JSON 清理函数
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
    
    return cleaned;
  };
  
  // 使用 useCallback 包装 generateStory 函数
  const generateStory = useCallback(async () => {
    if (isGenerating) return; // 防止重复请求
    
    setIsLoading(true);
    setIsGenerating(true);
    
    try {
      // 准备词汇和语法数据
      const vocabData = unitVocabulary.map((v: any) => ({
        word: v.word,
        definition: v.definition || ''
      }));
      
      const grammarData = unitGrammar.map((g: any) => ({
        point: g.grammar_point,
        explanation: g.explanation || ''
      }));
      
      // 调用 AI 服务生成故事
      const storyResponse = await generateForestStory(
        unitTitle,
        vocabData,
        grammarData,
        characters
      );
      
      // 处理 AI 返回的数据
      let storyData;
      
      // 检查返回的数据是否已经是对象
      if (typeof storyResponse === 'object') {
        storyData = storyResponse;
      } else {
        // 如果是字符串，尝试解析 JSON
        try {
          // 清理 JSON 字符串
          const cleanedJson = cleanJsonResponse(storyResponse);
          storyData = JSON.parse(cleanedJson);
        } catch (parseError) {
          console.error('Error parsing story JSON:', parseError);
          throw new Error('JSON parsing failed');
        }
      }
      
      // 验证数据结构和完整性
      if (!storyData.dialogues || !Array.isArray(storyData.dialogues)) {
        throw new Error('Invalid story data structure: dialogues missing or not an array');
      }
      
      if (!storyData.quizQuestion || !Array.isArray(storyData.quizQuestion)) {
        throw new Error('Invalid story data structure: quizQuestion missing or not an array');
      }
      
      // 验证每页对话的完整性
      const isDataComplete = storyData.dialogues.every((page: any[]) => 
        Array.isArray(page) && page.length >= 4
      );
      
      // 如果数据不完整且尝试次数未达上限，重试
      if (!isDataComplete && generationAttempts < maxAttempts) {
        console.log('Incomplete story data, retrying...');
        setGenerationAttempts(prev => prev + 1);
        setIsGenerating(false);
        return generateStory(); // 递归调用，重新生成
      }
      
      console.log('Final story data:', storyData);
      
      // 处理角色引用
      const processedDialogues = storyData.dialogues.map((page: any[]) => {
        if (!Array.isArray(page)) {
          console.warn('Page is not an array:', page);
          return [];
        }
        
        return page.map((dialogue: any) => {
          if (!dialogue || typeof dialogue !== 'object') {
            console.warn('Invalid dialogue object:', dialogue);
            return null;
          }
          
          let characterObj;
          
          // 处理不同格式的角色引用
          if (typeof dialogue.character === 'string') {
            // 如果是字符串ID，查找对应的角色对象
            characterObj = characters.find(c => 
              c.id === dialogue.character || 
              c.name.toLowerCase() === dialogue.character.toLowerCase()
            );
          } else if (dialogue.character && typeof dialogue.character === 'object') {
            // 如果已经是对象，检查是否有必要的属性
            if (dialogue.character.id) {
              characterObj = characters.find(c => c.id === dialogue.character.id);
            } else if (dialogue.character.name) {
              characterObj = characters.find(c => 
                c.name.toLowerCase() === dialogue.character.name.toLowerCase()
              );
            } else {
              characterObj = dialogue.character;
            }
          }
          
          // 如果找不到角色，使用默认角色
          if (!characterObj) {
            console.warn(`Character not found: ${JSON.stringify(dialogue.character)}`);
            characterObj = characters[0];
          }
          
          return {
            ...dialogue,
            character: characterObj
          };
        }).filter(Boolean); // 过滤掉无效的对话
      });
      
      setStoryDialogues(processedDialogues);
      setQuizQuestions(storyData.quizQuestion);
      setGenerationAttempts(0); // 重置尝试次数
      
    } catch (error) {
      console.error('Error generating story:', error);
      toast.error('Failed to create the story. Please try again.');
      
      // 创建一个简单的备用对话和问题
      createSimpleDialogue();
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [unitTitle, unitVocabulary, unitGrammar, characters, isGenerating]);
  
  // 修改 createSimpleDialogue 函数
  const createSimpleDialogue = () => {
    const simpleDialogues = [
      [
        {
          character: characters[0],
          text: `Welcome to our forest! Today we're going to talk about ${unitTitle}.`,
          translation: `欢迎来到我们的森林！今天我们要谈论${unitTitle}。`,
          grammar: "Simple present tense"
        },
        {
          character: characters[3],
          text: `What will we learn about ${unitTitle}?`,
          translation: `我们将学习关于${unitTitle}的什么内容？`,
          grammar: "Question formation"
        }
      ]
    ];
    
    const simpleQuizzes = [
      {
        question: `What is this story about?`,
        options: [unitTitle, "Animals", "Forest", "School"],
        correctAnswer: 0
      },
      {
        question: `Who lives in the forest?`,
        options: ["Teachers", "Animals", "Children", "Robots"],
        correctAnswer: 1
      },
      {
        question: `What do the animals teach?`,
        options: ["Math", "Science", "English", "Art"],
        correctAnswer: 2
      },
      {
        question: `Where does the story take place?`,
        options: ["School", "City", "Forest", "Beach"],
        correctAnswer: 2
      }
    ];
    
    setStoryDialogues(simpleDialogues);
    setQuizQuestions(simpleQuizzes);
  };
  
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
  
  // 在页面变化时重置可见对话
  useEffect(() => {
    if (!isLoading && storyDialogues && storyDialogues[currentPage]) {
      setVisibleDialogues([]);
      
      // 逐个显示对话
      storyDialogues[currentPage].forEach((_: any, index: number) => {
        setTimeout(() => {
          setVisibleDialogues(prev => [...prev, index]);
        }, 1000 * index); // 每个对话间隔1秒显示
      });
    }
  }, [currentPage, isLoading, storyDialogues]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fs-overlay">
      <div className="fs-container">
        <div className="fs-header">
          <div className="fs-header-left">
            <h2>Forest Friends: {unitTitle}</h2>
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