import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

interface UnicornRecordsState {
  data: any[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: UnicornRecordsState = {
  data: [],
  status: 'idle',
  error: null,
};

export const fetchUnicornRecords = createAsyncThunk(
  'unicornRecords/fetchUnicornRecords',
  async (userId: string) => {
    const { data, error } = await supabase
      .from('unicorn_records')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data || [];
  }
);

const unicornRecordsSlice = createSlice({
  name: 'unicornRecords',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUnicornRecords.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUnicornRecords.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchUnicornRecords.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch unicorn records';
      });
  },
});

export default unicornRecordsSlice.reducer; 