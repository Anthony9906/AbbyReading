import OpenAI from 'openai';

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  baseURL: import.meta.env.VITE_OPENAI_BASE_URL,
  dangerouslyAllowBrowser: true // 在浏览器中使用 API 密钥（注意：在生产环境中应避免这样做）
});

interface GrammarQuizPromptData {
  grammar_title: string;
  grammar_text: string;
  example?: string;
  exercise?: string;
}

export const generateGrammarQuiz = async (promptData: GrammarQuizPromptData) => {
  try {
    // 构建提示
    const prompt = `
      Generate 3 fill-in-the-blank questions based on the following grammar point:
      
      Title: ${promptData.grammar_title}
      Grammar Explanation: ${promptData.grammar_text}
      Example: ${promptData.example || 'No example provided'}
      Exercise: ${promptData.exercise || 'No exercise provided'}
      
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
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates grammar quiz questions." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });
    
    // 解析 AI 响应
    const content = response.choices[0]?.message?.content || '';
    if (!content) {
      throw new Error('No content in response');
    }
      
    return content;
  } catch (error) {
    console.error('Error generating grammar quiz:', error);
    throw error;
  }
}; 