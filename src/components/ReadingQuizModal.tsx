import { useState, useEffect } from 'react';
import { Loader2, X, CheckCircle, XCircle, Send, RefreshCw, RotateCcw, Zap, Bug } from 'lucide-react';
import OpenAI from 'openai';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import confetti from 'canvas-confetti';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  baseURL: import.meta.env.VITE_OPENAI_BASE_URL,
  dangerouslyAllowBrowser: true
});

interface ReadingQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyContent: string;
  unitId: string;
  storyId?: string;
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

export const ReadingQuizModal = ({ isOpen, onClose, storyContent, unitId, storyId }: ReadingQuizModalProps) => {
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentQuizId, setCurrentQuizId] = useState<string>('');
  const [quizGenerated, setQuizGenerated] = useState<boolean>(false);

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
    if (isOpen && storyContent && unitId && !quizGenerated && userId) {
      generateQuiz();
      setQuizGenerated(true);
    }
    
    // 当模态框关闭时重置状态
    if (!isOpen) {
      setQuizGenerated(false);
    }
  }, [isOpen, storyContent, unitId, quizGenerated, userId]);

  // 获取特定 quiz_id 的问题
  const fetchQuizQuestions = async (quizId: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('reading_quiz')
        .select('*')
        .eq('unit_id', unitId)
        .eq('type', 'in_class_reading')
        .eq('quiz_id', quizId);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // 转换数据格式
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

  const generateQuiz = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setQuizQuestions([]);
    setShowResults(false);
    
    // 生成新的 quiz_id
    const newQuizId = uuidv4();
    setCurrentQuizId(newQuizId);

    try {
      const prompt = `Please help me generate a reading comprehension quiz based on the following story:

      Story Content: ${storyContent}

      Please generate 3 fill-in-the-blank questions.
      Each question should have 3 options.
      The answer should be one of the options, and the answer should be in the same language as the story, and random for options.
      Please generate the quiz in the following JSON format:
      {
        "quiz_content": "Quiz Content",
        "quiz": [
          {
            "question": "Question 1",
            "options": ["Option 1", "Option 2", "Option 3"],
            "answer": "Answer 1"
          },
          {
            "question": "Question 2",
            "options": ["Option 1", "Option 2", "Option 3"],
            "answer": "Answer 2"
          },
          {
            "question": "Question 3",
            "options": ["Option 1", "Option 2", "Option 3"],
            "answer": "Answer 3"
          }
        ]
      }
      Please return the JSON format, and don't return any other text.
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant that creates reading comprehension quizzes." },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
      });
      
      const generatedContent = response.choices[0]?.message?.content || '';
      
      try {
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
          
          // 保存问题到数据库
          if (userId) {
            await saveQuizQuestions(questions);
          } else {
            setQuizQuestions(questions);
          }
        } else {
          throw new Error("Invalid quiz format");
        }
      } catch (error) {
        console.error("Error parsing quiz data:", error);
        toast.error("Failed to generate quiz. Please try again.");
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast.error('Failed to generate quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存问题到数据库
  const saveQuizQuestions = async (questions: QuizQuestion[]) => {
    setIsSaving(true);
    
    try {
      // 保存新问题
      for (const question of questions) {
        const { error } = await supabase
          .from('reading_quiz')
          .insert({
            unit_id: unitId,
            story_id: storyId,
            user_id: userId,
            type: 'in_class_reading',
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

  // 处理用户选择答案
  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    if (showResults) return;
    
    const updatedQuestions = [...quizQuestions];
    updatedQuestions[questionIndex].userAnswer = answer;
    setQuizQuestions(updatedQuestions);
  };

  // 提交答案
  const handleSubmitAnswers = async () => {
    // 检查是否所有问题都已回答
    const allAnswered = quizQuestions.every(q => q.userAnswer);
    if (!allAnswered) {
      toast.error('Please answer all questions before submitting');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let correctCount = 0;
      const updatedQuestions = [...quizQuestions];
      
      for (let i = 0; i < updatedQuestions.length; i++) {
        const question = updatedQuestions[i];
        const isCorrect = question.userAnswer === question.answer;
        
        if (isCorrect) correctCount++;
        
        question.isCorrect = isCorrect;
        
        // 保存答案记录
        if (question.id && userId) {
          const { error } = await supabase
            .from('reading_quiz_records')
            .insert({
              reading_quiz_question_id: question.id,
              user_id: userId,
              user_select_answer: question.userAnswer || '',
              is_correct: isCorrect,
              quiz_id: currentQuizId
            });
            
          if (error) throw error;
        }
      }
      
      // 如果全部答对，记录到 unicorn_records 表
      if (correctCount === quizQuestions.length && quizQuestions.length > 0 && userId) {
        // 首先检查用户在该单元的该类型测验中已有多少次满分记录
        const { data: existingRecords, error: countError } = await supabase
          .from('unicorn_records')
          .select('id')
          .eq('user_id', userId)
          .eq('unit_id', unitId)
          .eq('quiz_type', 'in-class-reading');
          
        if (countError) {
          console.error('Error checking existing unicorn records:', countError);
        } else {
          // 如果记录数少于8，则添加新记录
          if (existingRecords.length < 8) {
            const { error } = await supabase
              .from('unicorn_records')
              .insert({
                user_id: userId,
                unit_id: unitId,
                quiz_id: currentQuizId,
                quiz_type: 'in-class-reading'
              });
              
            if (error) {
              // 如果是唯一约束冲突，说明已经记录过，不需要显示错误
              if (error.code !== '23505') { // PostgreSQL 唯一约束冲突的错误代码
                console.error('Error recording unicorn record:', error);
              }
            } else {
              // 记录成功，显示祝贺信息
              toast.success('Perfect score! You earned a unicorn badge!', {
                icon: '🦄',
                duration: 5000
              });
            }
          } else {
            // 已达到8次上限，显示不同的消息
            toast.success('Perfect score! Great job!', {
              duration: 3000
            });
          }
        }
      } else {
        toast.success('Some questions are incorrect. Keep trying!', {
          duration: 3000
        });
      }
      
      setQuizQuestions(updatedQuestions);
      setScore(correctCount);
      setShowResults(true);
      
      // 滚动到弹出窗顶部
      const modalContent = document.querySelector('.reading-quiz-content');
      if (modalContent) {
        modalContent.scrollTop = 0;
      }
      
      // 如果全部答对，触发庆祝动画
      if (correctCount === quizQuestions.length && quizQuestions.length > 0) {
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
    } catch (error) {
      console.error('Error submitting answers:', error);
      toast.error('Failed to submit answers');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 重置测验
  const resetQuiz = () => {
    setShowResults(false);
    setQuizQuestions(quizQuestions.map(q => ({ ...q, userAnswer: undefined, isCorrect: undefined })));
  };

  if (!isOpen) return null;

  return (
    <div className="reading-quiz-modal-overlay">
      <div className="reading-quiz-modal">
        <div className="reading-quiz-header">
          <h2>Reading Comprehension Quiz</h2>
          <button onClick={onClose} className="close-button">
            <X size={24} />
          </button>
        </div>
        
        <div className="reading-quiz-content">
          {isLoading ? (
            <div className="loading-container">
              <Loader2 className="loading-spinner" />
              <p>Generating quiz...</p>
            </div>
          ) : (
            <>
              {showResults && (
                <div className="quiz-results">
                  {/* 全部答对时显示奖杯图标 */}
                  {score === quizQuestions.length && quizQuestions.length > 0 && (
                    <div className="perfect-score">
                     🎉
                     </div>
                  )}
                  {score < quizQuestions.length && quizQuestions.length > 0 && (
                    <div className="not-perfect-score">
                      <Bug className="not-perfect-score" size={45} />
                    </div>
                  )}

                  <div className="score-percentage">
                    {Math.round((score / quizQuestions.length) * 100)}%
                  </div>
                </div>
              )}
              
              <div className="quiz-questions">
                {quizQuestions.map((question, qIndex) => (
                  <div 
                    key={`question-${qIndex}`} 
                    className={`quiz-question ${showResults ? (question.isCorrect ? 'correct' : 'incorrect') : ''}`}
                  >
                    <div className="question-header">
                      <h3>Question {qIndex + 1}</h3>
                      {showResults && (
                        question.isCorrect ? 
                          <CheckCircle className="result-icon correct" /> : 
                          <XCircle className="result-icon incorrect" />
                      )}
                    </div>
                    
                    <p className="question-text">{question.question}</p>
                    
                    <div className="question-options">
                      {question.options.map((option, oIndex) => (
                        <div 
                          key={`option-${qIndex}-${oIndex}`}
                          className={`question-option ${
                            question.userAnswer === option ? 'selected' : ''
                          } ${
                            showResults && question.answer === option ? 'correct-answer' : ''
                          } ${
                            showResults && question.userAnswer === option && question.userAnswer !== question.answer ? 'wrong-answer' : ''
                          }`}
                          onClick={() => handleAnswerSelect(qIndex, option)}
                        >
                          <div className="option-letter">{String.fromCharCode(65 + oIndex)}</div>
                          <div className="option-text">{option}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        <div className="reading-quiz-footer">
          {!showResults ? (
            <button 
              onClick={handleSubmitAnswers} 
              className="submit-button"
              disabled={isSubmitting || isLoading || quizQuestions.some(q => !q.userAnswer)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="loading-icon" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Answers</span>
                </>
              )}
            </button>
          ) : (
            <div className="result-actions">
              <button 
                onClick={resetQuiz} 
                className="retry-button"
              >
                <RotateCcw size={16} />
                <span>Try Again</span>
              </button>
              <button 
                onClick={generateQuiz} 
                className="regenerate-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="loading-icon" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    <span>Generate New Quiz</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 