import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

interface Unit {
  id: string;
  title: string;
  unit: string;
  week: string;
  type: string;
  begin_date: string;
  end_date: string;
  reading_file: string | null;
  report_file: string | null;
  progress: number;
  created_at: string;
  stories?: Array<{
    content: string;
    type: string;
  }>;
  story?: {
    content: string;
  } | null;
  weekly_report?: {
    original_text: string;
  } | null;
}

interface UnitsPageState {
  units: Unit[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: UnitsPageState = {
  units: [],
  status: 'idle',
  error: null,
};

// 异步 thunk 用于获取单元数据
export const fetchUnitsPage = createAsyncThunk('unitsPage/fetchUnits', async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('units')
      .select(`
        *,
        stories (
          content,
          type
        ),
        weekly_report (
          original_text
        )
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 处理数据，找到每个 unit 的 inclass 类型故事和周报
    const unitsWithData = data?.map(unit => ({
      ...unit,
      story: unit.stories?.find((story: { type: string }) => story.type === 'inclass') || null,
      weekly_report: unit.weekly_report?.[0] || null
    }));

    return unitsWithData || [];
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch units');
  }
});

// 异步 thunk 用于添加单元
export const addUnit = createAsyncThunk('unitsPage/addUnit', 
  async (unitData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('units')
        .insert([
          {
            ...unitData,
            user_id: user?.id
          }
        ])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error: any) {
      throw new Error(error.message || 'Failed to add unit');
    }
  }
);

// 异步 thunk 用于编辑单元
export const editUnit = createAsyncThunk('unitsPage/editUnit', 
  async ({ unitId, unitData }: { unitId: string, unitData: any }) => {
    try {
      const { data, error } = await supabase
        .from('units')
        .update(unitData)
        .eq('id', unitId)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update unit');
    }
  }
);

const unitsPageSlice = createSlice({
  name: 'unitsPage',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // 处理 fetchUnitsPage
      .addCase(fetchUnitsPage.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUnitsPage.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.units = action.payload;
      })
      .addCase(fetchUnitsPage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      })
      // 处理 addUnit
      .addCase(addUnit.fulfilled, (state, action) => {
        // 添加新单元到数组开头（因为按创建时间降序排列）
        const newUnit = {
          ...action.payload,
          story: null,
          weekly_report: null
        };
        state.units.unshift(newUnit);
      })
      // 处理 editUnit
      .addCase(editUnit.fulfilled, (state, action) => {
        const index = state.units.findIndex(unit => unit.id === action.payload.id);
        if (index !== -1) {
          // 保留原有的 story 和 weekly_report
          const story = state.units[index].story;
          const weekly_report = state.units[index].weekly_report;
          state.units[index] = {
            ...action.payload,
            story,
            weekly_report
          };
        }
      });
  },
});

export default unitsPageSlice.reducer; 