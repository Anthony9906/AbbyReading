export interface StatItem {
  label: string;
  value: number;
}

export interface UserStats {
  stories: StatItem;
  glossary: StatItem;
  units: StatItem;
}
