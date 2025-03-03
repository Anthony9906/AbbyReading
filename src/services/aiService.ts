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

// 生成森林故事对话
export const generateForestStory = async (
  unitTitle: string,
  vocabulary: any[],
  grammar: any[],
  characters: any[]
): Promise<any> => {
  try {
    // 构建提示
    const prompt = `
      Create a forest story dialogue for elementary school students (Grade 1) learning about "${unitTitle}".
      
      The story should feature these animal characters with their specific language styles:
      ${characters.map((char: any) => `- ${char.name} (${char.species}): ${char.description}`).join('\n')}
      
      Vocabulary words to include:
      ${vocabulary.map((v: any) => `- ${v.word}: ${v.definition}`).join('\n')}
      
      Grammar points to demonstrate:
      ${grammar.map((g: any) => `- ${g.point}: ${g.explanation}`).join('\n')}
      
      Create a story with 5 pages of dialogues:
      1. Introduction to the topic
      2. Development of the conversation
      3. Discussion of key vocabulary and grammar
      4. A interesting joke from the forest
      5. Conclusion and review
      
      For each dialogue, include:
      - The character speaking
      - The dialogue text (using the character's specific language style)
      - A Chinese translation of the dialogue
      - The grammar structure being used

      Make sure every dialogue have at least 4 sentences from 2 characters, and each character should appear at least 2 dialogues.
      
      For each page of dialogue, also create one quiz question related to that page with 4 options and the index of the correct answer.
      
      Format the response as a JSON object with these properties:
      {
        "dialogues": [
          [
            {
              "character": "character_id",
              "text": "dialogue text",
              "translation": "Chinese translation",
              "grammar": "grammar point used"
            },
            ...more dialogues for page 1
          ],
          ...more pages
        ],
        "quizQuestion": [
          {
            "question": "quiz question for page 1",
            "options": ["option1", "option2", "option3", "option4"],
            "correctAnswer": 0
          },
          // One quiz question for each page
        ]
      }
      
      Please return only the JSON format, and don't return any other text or markdown code block.
    `;

    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an educational assistant that creates engaging stories for children learning English.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 1,
      max_tokens: 2000
    });
    
    // 获取 AI 响应内容
    const content = response.choices[0]?.message?.content || '';
    if (!content) {
      throw new Error('No content in response');
    }
    
    // 清理 JSON 字符串
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
      return cleaned;
    };
    
    // 清理并解析 JSON
    const cleanedJson = cleanJsonResponse(content);
    const storyContent = JSON.parse(cleanedJson);
    
    // 处理角色ID，将字符串ID转换为完整的角色对象
    const processedDialogues = storyContent.dialogues.map((page: any[]) => {
      return page.map((dialogue: any) => {
        let characterObj = null;
        
        // 如果角色是字符串（可能是ID、名称或物种）
        if (typeof dialogue.character === 'string') {
          // 尝试多种匹配方式
          characterObj = characters.find(c => 
            // 精确匹配ID
            c.id === dialogue.character || 
            // 不区分大小写匹配名称
            c.name.toLowerCase() === dialogue.character.toLowerCase() ||
            // 不区分大小写匹配物种
            c.species.toLowerCase() === dialogue.character.toLowerCase() ||
            // 部分匹配名称（例如"Owl"匹配"Professor Hoot"）
            c.name.toLowerCase().includes(dialogue.character.toLowerCase()) ||
            // 部分匹配物种（例如"owl"匹配"Owl"）
            dialogue.character.toLowerCase().includes(c.species.toLowerCase())
          );
        } 
        // 如果角色已经是对象（可能有id或name属性）
        else if (dialogue.character && typeof dialogue.character === 'object') {
          if (dialogue.character.id) {
            characterObj = characters.find(c => c.id === dialogue.character.id);
          } else if (dialogue.character.name) {
            characterObj = characters.find(c => 
              c.name.toLowerCase() === dialogue.character.name.toLowerCase()
            );
          } else if (dialogue.character.species) {
            characterObj = characters.find(c => 
              c.species.toLowerCase() === dialogue.character.species.toLowerCase()
            );
          }
        }
        
        // 如果找不到角色，尝试从对话文本中推断
        if (!characterObj) {
          // 记录未匹配的角色信息以便调试
          console.warn('Character not matched:', dialogue.character);
          
          // 从对话文本中尝试识别角色特征
          const text = dialogue.text.toLowerCase();
          
          if (text.includes('?') || text.includes('what') || text.includes('why') || text.includes('how')) {
            // 问题多的可能是兔子
            characterObj = characters.find(c => c.id === 'rabbit');
          } else if (text.includes('!') || text.length < 50) {
            // 感叹号多或句子短的可能是松鼠
            characterObj = characters.find(c => c.id === 'squirrel');
          } else if (text.includes('should') || text.includes('please') || text.includes('let\'s')) {
            // 建议句型可能是狐狸
            characterObj = characters.find(c => c.id === 'fox');
          } else if (text.length > 100) {
            // 长句子可能是猫头鹰教授
            characterObj = characters.find(c => c.id === 'owl');
          } else {
            // 其他情况可能是乌龟爷爷
            characterObj = characters.find(c => c.id === 'turtle');
          }
        }
        
        // 如果仍然找不到角色，随机分配一个角色（而不是总是使用第一个）
        if (!characterObj) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          characterObj = characters[randomIndex];
        }
        
        return {
          ...dialogue,
          character: characterObj
        };
      });
    });

    // 如果 AI 只返回了一个测验问题，我们需要复制它以匹配页面数量
    if (storyContent.quizQuestion && !Array.isArray(storyContent.quizQuestion)) {
      // 将单个问题转换为数组
      return {
        dialogues: processedDialogues,
        quizQuestion: Array(processedDialogues.length).fill(storyContent.quizQuestion)
      };
    }

    // 如果测验问题数量少于对话页面数量，复制最后一个问题填充
    if (Array.isArray(storyContent.quizQuestion) && storyContent.quizQuestion.length < processedDialogues.length) {
      const lastQuiz = storyContent.quizQuestion[storyContent.quizQuestion.length - 1];
      const filledQuizzes = [...storyContent.quizQuestion];
      
      while (filledQuizzes.length < processedDialogues.length) {
        filledQuizzes.push({...lastQuiz});
      }
      
      return {
        dialogues: processedDialogues,
        quizQuestion: filledQuizzes
      };
    }

    return {
      dialogues: processedDialogues,
      quizQuestion: storyContent.quizQuestion
    };
  } catch (error) {
    console.error('Error generating forest story:', error);
    throw error;
  }
}; 