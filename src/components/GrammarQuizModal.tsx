import { useState, useEffect, useRef } from 'react';
import '../styles/components/QuizModal.css';
import { supabase } from '../lib/supabase';
import { X, Loader2, CheckCircle, XCircle, Bug, HeartHandshake } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import OpenAI from 'openai';
import confetti from 'canvas-confetti';

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  baseURL: import.meta.env.VITE_OPENAI_BASE_URL,
  dangerouslyAllowBrowser: true
});

interface GrammarQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  grammarPoint: any;
}

interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  answer: string;
  userAnswer?: string;
  isCorrect?: boolean;
  quiz_id?: string;
}

interface QuizData {
  quiz_content: string;
  quiz: QuizQuestion[];
}

export const GrammarQuizModal = ({ 
  isOpen, 
  onClose, 
  unitId,
  grammarPoint 
}: GrammarQuizModalProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [quizId, setQuizId] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 添加 ref 用于滚动
  const modalContentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // 获取当前用户ID
    const fetchUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };
    
    fetchUserId();
    if (!isSaving) {
      // 如果正在保存，则不生成测验
    }
    
    // 只在模态框首次打开时生成测验
    if (isOpen && grammarPoint && unitId && !quizGenerated && userId) {
      generateQuiz();
      setQuizGenerated(true);
    }
    
    // 当模态框关闭时重置状态
    if (!isOpen) {
      setQuizGenerated(false);
      setQuizQuestions([]);
      setSelectedOptions({});
      setShowResults(false);
      setScore(0);
    }
  }, [isOpen, grammarPoint, unitId, quizGenerated, userId]);
  
  const generateQuiz = async () => {
    try {
      setIsLoading(true);
      setGenerating(true);
      
      // 生成新的 quiz_id
      const newQuizId = uuidv4();
      setQuizId(newQuizId);
      
      // 准备提示
      const prompt = `
      Generate 3 fill-in-the-blank questions based on the following grammar point:
      
      Title: ${grammarPoint.title}
      Grammar Explanation: ${grammarPoint.explanation}
      Example: ${grammarPoint.example || 'No example provided'}
      Exercise: ${grammarPoint.exercise || 'No exercise provided'}
      
      For each question:
      1. Create a clear question that tests understanding of this grammar point
      2. Provide 3 options (A, B, C)
      3. Indicate the correct answer, and the answer should be one of the options, and random for options.
      4. Include a brief explanation of why the answer is correct
      
      Format your response as a JSON object with the following structure:
      {
        "quiz_content": "Quiz Content",
        "quiz": [
          {
            "question": "Question text here",
            "options": ["Option A", "Option B", "Option C"],
            "answer": "The correct option text",
            "explanation": "Explanation of why this is correct"
          },
          // ... more questions
        ]
      }
      Please return the JSON format, and don't return any other text.
    `;
      
      const response = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant that creates grammar quizzes." },
          { role: "user", content: prompt }
        ],
        temperature: 1,
      });
      
      const generatedContent = response.choices[0]?.message?.content || '';
      
      // 尝试解析 JSON
      let quizData: QuizData;
        
      // 处理可能的非 JSON 响应
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid JSON format");
      }
      
      if (quizData && quizData.quiz && Array.isArray(quizData.quiz)) {
        const questions: QuizQuestion[] = quizData.quiz.map(q => ({
          question: q.question,
          options: q.options,
          answer: q.answer,
          quiz_id: newQuizId
        }));
      
        if (userId) {
          await saveQuizQuestions(questions);
        } else {
          setQuizQuestions(questions);
        }
      } else {
        throw new Error("Invalid quiz format");
      }
      
      setGenerating(false);
      setIsLoading(false);
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Failed to generate quiz. Please try again.");
      setGenerating(false);
      setIsLoading(false);
    }
  };

  const saveQuizQuestions = async (questions: QuizQuestion[]) => {
    setIsSaving(true);
    
    try {
      // 保存新问题
      for (const question of questions) {
        const { error } = await supabase
          .from('grammar_quiz')
          .insert({
            unit_id: unitId,
            grammar_id: grammarPoint.id,
            user_id: userId,
            question: question.question,
            option1: question.options[0],   
            option2: question.options[1],
            option3: question.options[2],
            answer: question.answer,
            quiz_id: question.quiz_id
          });
          
        if (error) throw error;
      }
      
      // 获取当前 quiz_id 的问题
      await fetchQuizQuestions(questions[0].quiz_id || '');
      toast.success('Quiz generated successfully');
    } catch (error) {
      console.error('Error saving quiz questions:', error);
      toast.error('Failed to save quiz questions');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchQuizQuestions = async (quizId: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('grammar_quiz')
        .select('*')
        .eq('unit_id', unitId)
        .eq('quiz_id', quizId);
        
      if (error) throw error;
      
      if (data && data.length > 0) {    
        const questions: QuizQuestion[] = data.map(item => ({
          id: item.id,
          question: item.question,
          options: [item.option1, item.option2, item.option3],
          answer: item.answer,
          quiz_id: item.quiz_id 
        }));
        
        setQuizQuestions(questions);
      }
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
      toast.error('Failed to fetch quiz questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (questionIndex: number, option: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [questionIndex]: option
    }));
  };
  
  const handleSubmitQuiz = async () => {
    // 检查是否所有问题都已回答
    if (Object.keys(selectedOptions).length < questions.length) {
      toast.error('Please answer all questions before submitting');
      return;
    }
    
    let newScore = 0;
    const updatedQuestions = [...questions];
    
    // 计算分数并更新问题状态
    for (let i = 0; i < updatedQuestions.length; i++) {
      const userAnswer = selectedOptions[i];
      const isCorrect = userAnswer === updatedQuestions[i].answer;
      
      updatedQuestions[i].userAnswer = userAnswer;
      updatedQuestions[i].isCorrect = isCorrect;
      
      if (isCorrect) {
        newScore++;
      }
      
      // 保存用户答案到数据库
      try {
        const { error } = await supabase
          .from('grammar_quiz_records')
          .insert({
            grammar_quiz_question_id: updatedQuestions[i].id,
            user_id: userId,
            user_selected_answer: userAnswer,
            is_correct: isCorrect,
            quiz_id: quizId
          });
          
        if (error) throw error;
      } catch (error) {
        console.error('Error saving quiz answer:', error);
      }
    }
    
    setQuizQuestions(updatedQuestions);
    setScore(newScore);
    setShowResults(true);
    
    // 如果得分足够高，创建 unicorn 记录
    if (newScore === questions.length) {
      createUnicornRecord(newScore);
      
      // 如果全部答对，触发庆祝动画
      setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            gravity: 0.5,
            scalar: 1.4,
            shapes: ['circle', 'square', 'star'],
            ticks: 500,
            colors: ['#d3648b', '#f3cb6f', '#6b5ecd', '#418443', '#9335b9', '#da802c' ],
            zIndex: 2000 // 设置更高的 z-index 确保显示在弹窗前面
          });
        }, 500);
    }
    
    // 滚动到顶部
    setTimeout(() => {
      if (modalContentRef.current) {
        modalContentRef.current.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }, 100);
  };
  
  const createUnicornRecord = async (finalScore: number) => {
    try {
      // 只有在得分是满分时才创建记录
      if (finalScore !== questions.length) return;
      
      // 首先检查用户在该单元的语法测验中已有多少次满分记录
      const { data: existingRecords, error: countError } = await supabase
        .from('unicorn_records')
        .select('id')
        .eq('user_id', userId)
        .eq('unit_id', unitId)
        .eq('quiz_type', 'grammar');
        
      if (countError) {
        console.error('Error checking existing unicorn records:', countError);
      } else {
        // 如果记录数少于5，则添加新记录
        if (existingRecords.length < 6) {
          const { error } = await supabase
            .from('unicorn_records')
            .insert({
              user_id: userId,
              unit_id: unitId,
              quiz_id: quizId,
              quiz_type: 'grammar'
            });
            
          if (error) {
            // 如果是唯一约束冲突，说明已经记录过，不需要显示错误
            if (error.code !== '23505') { // PostgreSQL 唯一约束冲突的错误代码
              console.error('Error recording unicorn record:', error);
            }
          } else {
            // 记录成功，显示祝贺信息
            toast.success('Perfect score! You got a unicorn!', {
              icon: '🦄',
              duration: 5000
            });
          }
        } else {
          // 已达到5次上限，显示不同的消息
          toast.success('Perfect score! Great job!', {
            duration: 3000
          });
        }
      }
    } catch (error) {
      console.error("Error creating unicorn record:", error);
    }
  };
  
  const handleRestartQuiz = () => {
    setShowResults(false);
    setSelectedOptions({});
    // 不重新生成问题，只是重置状态
  };
  
  const handleGenerateNewQuiz = () => {
    setShowResults(false);
    setSelectedOptions({});
    setQuizQuestions([]);
    setGenerating(false);
    setQuizGenerated(false);
    // 这将触发 useEffect 重新生成新的测验
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="quiz-modal-overlay" onClick={onClose}>
      <div className="quiz-modal" onClick={e => e.stopPropagation()}>
        <div className="quiz-modal-header">
          <h2>Grammar Quiz: {grammarPoint.title}</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} color="white" />
          </button>
        </div>
        
        <div className="quiz-modal-content" ref={modalContentRef}>
          {isLoading ? (
            <div className="quiz-questions-header">
                <div className="quiz-questions-header">
                    <HeartHandshake className="not-perfect-score" size={65} />
                </div>
            <Loader2 className="loading-spinner" />
            <p>Generating quiz...</p>
            </div>
          ) : generating ? (
            <div className="loading-container">
              <Loader2 size={40} className="spinner" />
              <p>Generating grammar quiz...</p>
              <p className="generating-message">This may take a moment...</p>
            </div>
          ) : showResults ? (
            <div className="quiz-results">
              {score === questions.length && (
                <div className="celebration-container">
                  <div className="celebration-icon">🎉</div>
                  <h2 className="score-percentage">100%</h2>
                </div>
              )}
              
              {score !== questions.length && (
                <div className="not-perfect-score">
                  <Bug className="not-perfect-score" size={65} />
                  <p className="score-display"><span className="score">{score}/{questions.length}</span></p>
                </div>
              )}
              
              <div className="questions-review">
                  {questions.map((question, index) => (
                    <div key={index} className="question-review">
                      <h4 className="question-number">Question {index + 1}</h4>
                    <p className="question-text">{question.question}</p>
                    
                    <div className="options-review">
                      {question.options.map((option, optIndex) => {
                        const isUserAnswer = option === question.userAnswer;
                        const isCorrectAnswer = option === question.answer;
                        
                        let optionClass = "option-review";
                        if (isUserAnswer && question.isCorrect) {
                          optionClass += " correct";
                        } else if (isUserAnswer && !question.isCorrect) {
                          optionClass += " incorrect";
                        } else if (isCorrectAnswer && !question.isCorrect) {
                          optionClass += " correct-answer";
                        }
                        
                        const optionLabel = String.fromCharCode(65 + optIndex); // A, B, C, ...
                        
                        return (
                          <div key={optIndex} className={optionClass}>
                            <div className="option-content">
                              <span className="option-label">{optionLabel}</span>
                              <span className="option-text">{option}</span>
                            </div>
                            {isUserAnswer && (
                              question.isCorrect 
                                ? <CheckCircle className="result-icon" size={20} /> 
                                : <XCircle className="result-icon" size={20} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="quiz-questions">
            <div className="quiz-questions-header">
              <HeartHandshake className="not-perfect-score" size={65} />
            </div>
              {questions.map((question, index) => (
                <div key={index} className="quiz-question">
                  <h3 className="question-number">Question {index + 1}</h3>
                  <p className="question-text">{question.question}</p>
                  
                  <div className="options-container">
                    {question.options.map((option, optIndex) => {
                      const optionLabel = String.fromCharCode(65 + optIndex); // A, B, C, ...
                      
                      return (
                        <button
                          key={optIndex}
                          className={`option-button ${selectedOptions[index] === option ? 'selected' : ''}`}
                          onClick={() => handleOptionSelect(index, option)}
                        >
                          <div className="option-content">
                            <span className="option-label">{optionLabel}</span>
                            <span className="option-text">{option}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            <button 
                className="submit-quiz-button"
                onClick={handleSubmitQuiz}
                disabled={Object.keys(selectedOptions).length < questions.length}
              >
                Submit Quiz
              </button>
            </div>
          )}
        </div>
        
        {showResults && (
          <div className="quiz-footer">
            <button className="try-again-button" onClick={handleRestartQuiz}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Try Again
            </button>
            <button className="generate-new-button" onClick={handleGenerateNewQuiz}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
              Generate New Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 