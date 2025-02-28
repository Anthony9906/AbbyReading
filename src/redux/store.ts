import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import unitsReducer from './slices/unitsSlice';
import unicornRecordsReducer from './slices/unicornRecordsSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    units: unitsReducer,
    unicornRecords: unicornRecordsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 