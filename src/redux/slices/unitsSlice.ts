import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

interface UnitsState {
  data: any[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: UnitsState = {
  data: [],
  status: 'idle',
  error: null,
};

export const fetchUnits = createAsyncThunk('units/fetchUnits', async () => {
  // 获取当前用户会话
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }
  
  // 获取用户的 units 及关联数据
  const { data, error } = await supabase
    .from('units')
    .select(`
      id,
      title,
      reading_file,
      stories (
        id,
        content,
        type
      ),
      vocabulary (
        word,
        chinese_definition
      ),
      grammar (
        id,
        grammar_original_text,
        grammar_point,
        explanation,
        example,
        exercise,
        solution,
        summary
      )
    `)
    .eq('user_id', userId)
    .not('stories', 'is', null)
    .not('vocabulary', 'is', null)
    .not('grammar', 'is', null);
  
  if (error) {
    throw new Error(error.message);
  }
  
  // 处理数据，确保每个 unit 都有必要的关联数据
  const processedUnits = data
    .map((unit: any) => ({
      ...unit,
      story: unit.stories?.find((s: any) => s.type === 'inclass'),
      vocabulary: unit.vocabulary,
      grammar: unit.grammar
    }))
    .filter((unit: any) => unit.story && unit.vocabulary?.length > 0);
  
  return processedUnits || [];
});

const unitsSlice = createSlice({
  name: 'units',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUnits.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUnits.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchUnits.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch units data';
      });
  },
});

export default unitsSlice.reducer; 