import OpenAI from 'openai';

// 创建 OpenAI 客户端
// 注意：在前端暴露 API 密钥存在安全风险
// 更安全的做法是使用环境变量并通过代理服务器调用
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_WILDCARD_API_KEY, // 从 Vite 环境变量获取
  baseURL: import.meta.env.VITE_OPENAI_WILDCARD_BASE_URL,
  dangerouslyAllowBrowser: true // 允许在浏览器中使用，但有安全风险
});

// 将文本转换为语音并播放
export const speakWithOpenAI = async (text: string): Promise<void> => {
  try {
    // 调用 OpenAI TTS API
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'echo',
      input: text,
      speed: 0.8,
    });
    
    // 将响应转换为 ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    
    // 创建 Blob
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    
    // 创建音频 URL
    const url = URL.createObjectURL(blob);
    
    // 创建音频元素并播放
    const audio = new Audio(url);
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url); // 清理 URL
        resolve();
      };
      
      audio.onerror = (error) => {
        URL.revokeObjectURL(url); // 清理 URL
        reject(error);
      };
      
      audio.play().catch(reject);
    });
  } catch (error) {
    console.error('Error generating speech with OpenAI:', error);
    throw error;
  }
}; 