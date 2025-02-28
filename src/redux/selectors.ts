import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './store';

// 基础选择器
const selectUser = (state: RootState) => state.user;
const selectUnits = (state: RootState) => state.units;
const selectUnicornRecords = (state: RootState) => state.unicornRecords;

// 记忆化的选择器
export const selectUserData = createSelector(
  [selectUser],
  (user) => user.data
);

export const selectUserStatus = createSelector(
  [selectUser],
  (user) => user.status
);

export const selectUnitsStatus = createSelector(
  [selectUnits],
  (units) => units.status
);

export const selectUnicornStatus = createSelector(
  [selectUnicornRecords],
  (records) => records.status
);

// 用户统计数据选择器
export const selectUserStats = createSelector(
  [selectUnits, selectUnicornRecords],
  (units, unicornRecords) => {
    return {
      stories: { label: "STORIES", value: units.data.filter((unit: any) => unit.story).length || 0 },
      glossary: { label: "GLOSSARY", value: units.data.filter((unit: any) => unit.vocabulary?.length > 0).length || 0 },
      units: { label: "UNITS", value: units.data.length || 0 },
      unicorns: { label: "UNICORNS", value: unicornRecords.data.length || 0 }
    };
  }
); 