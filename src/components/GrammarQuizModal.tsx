import { useState, useEffect, useRef } from 'react';
import '../styles/components/QuizModal.css';
import { supabase } from '../lib/supabase';
import { X, Loader2, CheckCircle, XCircle, Bug } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import OpenAI from 'openai';

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
        temperature: 0.5,
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
      
      // 播放庆祝动画
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          import('canvas-confetti').then(confetti => {
            confetti.default({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          });
        }
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
      // 创建 unicorn 记录
      const { error } = await supabase
        .from('unicorn_records')
        .insert({
          user_id: userId,
          unit_id: unitId,
          record_type: 'grammar-quiz',
          description: `Completed grammar quiz for "${grammarPoint.title}" with score ${finalScore}/${questions.length}`
        });
        
      if (error) throw error;
      
      // 显示成功消息
      toast.success('You earned a unicorn for completing the grammar quiz!');
      
    } catch (error) {
      console.error("Error creating unicorn record:", error);
    }
  };
  
  const handleRestartQuiz = () => {
    setSelectedOptions({});
    setShowResults(false);
    setScore(0);
    generateQuiz();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="quiz-modal-overlay" onClick={onClose}>
      <div className="quiz-modal" onClick={e => e.stopPropagation()}>
        <div className="quiz-modal-header">
          <h2>Grammar Quiz: {grammarPoint.title}</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="quiz-modal-content" ref={modalContentRef}>
          {isLoading ? (
            <div className="loading-container">
              <Loader2 size={40} className="spinner" />
              <p>Loading quiz...</p>
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
                <div className="unicorn-celebration">
                  <div className="celebration-icon">
                  🎉
                  </div>
                  <h3 className="unicorn-text">Congratulations!</h3>
                  <p className="score-display"><span className="score">{score}/{questions.length}</span></p>
                </div>
              )}
              {score < questions.length && questions.length > 0 && (
                 <div className="not-perfect-score">
                    <Bug className="not-perfect-score" size={50} />
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
                        
                        return (
                          <div key={optIndex} className={optionClass}>
                            <span className="option-text">{option}</span>
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
              
              <div className="quiz-actions">
                <button className="restart-button" onClick={handleRestartQuiz}>
                  Try Again
                </button>
                <button className="close-quiz-button" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="quiz-questions">
              {questions.map((question, index) => (
                <div key={index} className="quiz-question">
                  <h3 className="question-number">Question {index + 1}</h3>
                  <p className="question-text">{question.question}</p>
                  
                  <div className="options-container">
                    {question.options.map((option, optIndex) => (
                      <button
                        key={optIndex}
                        className={`option-button ${selectedOptions[index] === option ? 'selected' : ''}`}
                        onClick={() => handleOptionSelect(index, option)}
                      >
                        {option}
                      </button>
                    ))}
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
      </div>
    </div>
  );
}; 