"use client";
import { FC } from "react";

interface UserHeaderProps {
  avatar: string;
  name: string;
  stats: {
    stories: { icon: string; label: string; value: number };
    glossary: { icon: string; label: string; value: number };
    units: { icon: string; label: string; value: number };
  };
}

export const UserHeader: FC<UserHeaderProps> = ({ avatar, name, stats }) => {
  return (
    <div className="flex justify-between items-center">
      {/* 左侧用户信息 */}
      <div className="flex items-center gap-4">
        <img src={avatar} alt={name} className="w-16 h-16 rounded-full" />
        <div>
          <div className="text-white text-sm">GOOD MORNING</div>
          <div className="text-white text-2xl font-bold">{name}</div>
        </div>
      </div>

      {/* 右侧统计信息 */}
      <div className="flex gap-8">
        {Object.entries(stats).map(([key, stat]) => (
          <div key={key} className="flex flex-col items-center">
            <img src={stat.icon} alt={stat.label} className="w-6 h-6" />
            <div className="text-white text-sm mt-1">{stat.label}</div>
            <div className="text-white text-xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
