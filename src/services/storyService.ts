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

interface ForestStoryData {
  user_id: string;
  unit_id: string;
  story_data: {
    dialogues: any[][];
    quizQuestions: any[];
  };
  used_vocabulary: string[];
  used_grammar: string[];
}

interface ForestStoryQuizSubmissionData {
  forest_story_id: string;
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

export const saveForestStory = async (data: ForestStoryData) => {
  try {
    const { data: insertedData, error } = await supabase
      .from('forest_stories')
      .insert([
        {
          user_id: data.user_id,
          unit_id: data.unit_id,
          story_data: data.story_data,
          used_vocabulary: data.used_vocabulary,
          used_grammar: data.used_grammar
        }
      ])
      .select();
    
    if (error) throw error;
    return insertedData?.[0];
  } catch (error) {
    console.error('Error saving forest story:', error);
    throw error;
  }
};

export const saveForestStoryQuizSubmission = async (data: ForestStoryQuizSubmissionData) => {
  try {
    const { data: insertedData, error } = await supabase
      .from('forest_story_submissions')
      .insert([
        {
          forest_story_id: data.forest_story_id,
          user_id: data.user_id,
          answers: data.answers,
          score: data.score
        }
      ])
      .select();
    
    if (error) throw error;
    return insertedData?.[0];
  } catch (error) {
    console.error('Error saving forest story quiz submission:', error);
    throw error;
  }
};

export const getUserForestStories = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('forest_stories')
      .select(`
        id,
        unit_id,
        story_data,
        used_vocabulary,
        used_grammar,
        created_at,
        forest_story_submissions (
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
    console.error('Error fetching user forest stories:', error);
    throw error;
  }
}; 