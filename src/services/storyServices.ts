import { supabase } from '../lib/supabase';

interface StoryContinueData {
  user_id: string;
  unit_id: string;
  continued_story: string;
  used_vocabulary: string[];
  quiz_data: any;
}

interface QuizSubmissionData {
  story_continue_id: string;
  user_id: string;
  answers: {
    questionIndex: number;
    selectedOption: string;
    isCorrect: boolean;
  }[];
  score: number;
}

export const saveStoryContinuation = async (data: StoryContinueData) => {
  try {
    const { data: insertedData, error } = await supabase
      .from('story_continues')
      .insert([
        {
          user_id: data.user_id,
          unit_id: data.unit_id,
          continued_story: data.continued_story,
          used_vocabulary: data.used_vocabulary,
          quiz_data: data.quiz_data
        }
      ])
      .select();
    
    if (error) throw error;
    return insertedData?.[0];
  } catch (error) {
    console.error('Error saving story continuation:', error);
    throw error;
  }
};

export const saveQuizSubmission = async (data: QuizSubmissionData) => {
  try {
    const { data: insertedData, error } = await supabase
      .from('story_continue_submissions')
      .insert([
        {
          story_continue_id: data.story_continue_id,
          user_id: data.user_id,
          answers: data.answers,
          score: data.score
        }
      ])
      .select();
    
    if (error) throw error;
    return insertedData?.[0];
  } catch (error) {
    console.error('Error saving quiz submission:', error);
    throw error;
  }
};

export const getUserStoryContinuations = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('story_continues')
      .select(`
        id,
        unit_id,
        continued_story,
        used_vocabulary,
        quiz_data,
        created_at,
        story_continue_submissions (
          id,
          score,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user story continuations:', error);
    throw error;
  }
}; 