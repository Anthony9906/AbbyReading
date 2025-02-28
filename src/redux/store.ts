import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import unitsReducer from './slices/unitsSlice';
import unicornRecordsReducer from './slices/unicornRecordsSlice';
import unitsPageReducer from './slices/unitsPageSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    units: unitsReducer,
    unicornRecords: unicornRecordsReducer,
    unitsPage: unitsPageReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 