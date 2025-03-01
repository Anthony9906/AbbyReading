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

// 新增：故事续写接口
interface StoryContinuePromptData {
  original_story: string;
  unit_title: string;
  vocabulary: string[];
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

// 新增：生成故事续写和问答题的方法
export const generateStoryContinuation = async (promptData: StoryContinuePromptData) => {
  try {
    // 构建提示
    const prompt = `
      Continue the following story with an engaging and slightly more challenging narrative. 
      
      Original Story: ${promptData.original_story}
      
      Unit Title: ${promptData.unit_title}
      
      Vocabulary to include (use at least 5-7 of these words): ${promptData.vocabulary.join(', ')}
      
      Requirements:
      1. Continue the story with the same characters
      2. Make the story interesting with themes like adventure, humor, love and family, or overcoming challenges
      3. The story difficulty (Lexile level) should be 300L for G1 student
      4. The words count of the continued story should NOT more than 120 words
      5. Include some of the vocabulary words listed above
      6. The story should be a complete story, not a fragment, and separate paragraphs for beginning, middle and end
      7. The story should be a surprise, not a predictable continuation
      8. Each paragraph should be end with a period

      After the story, generate 3 reading comprehension questions with 3 options each to test understanding of key story elements for G1 student.
      
      Format your response as a JSON object with the following structure:
      {
        "continued_story": "The full continued story text",
        "coutinues_story_words_count": "The words count of the continued story",
        "used_vocabulary": ["word1", "word2", "word3", ...],
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
      
      Please return only the JSON format, and don't return any other text or markdown code block.
    `;
    
    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o", // 或者使用更强大的模型
      messages: [
        { role: "system", content: "You are a creative storyteller who can continue stories and create engaging reading comprehension questions." },
        { role: "user", content: prompt }
      ],
      temperature: 1, // 稍微提高创造性
      max_tokens: 3000, // 增加token限制以容纳更长的故事
    });
    
    // 解析 AI 响应
    const content = response.choices[0]?.message?.content || '';
    if (!content) {
      throw new Error('No content in response');
    }

    return content;
  } catch (error) {
    console.error('Error generating story continuation:', error);
    throw error;
  }
}; 