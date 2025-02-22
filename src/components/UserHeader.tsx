"use client";
import { FC } from "react";
import { BookOpen, BookText, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserHeaderProps {
  avatar: string;
  name: string;
  stats: {
    stories: { label: string; value: number; onClick?: () => void };
    glossary: { label: string; value: number };
    units: { label: string; value: number };
  };
}

export const UserHeader: FC<UserHeaderProps> = ({ avatar, name, stats }) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-start">
      {/* 左侧用户信息 */}
      <div className="flex items-center gap-4">
        <img src={avatar} alt={name} className="w-16 h-16 rounded-full" />
        <div>
          <div className="text-white text-sm">GOOD MORNING</div>
          <div className="text-white text-2xl font-bold">{name}</div>
        </div>
      </div>

      {/* 右侧统计信息 */}
      <div className="flex gap-8 items-center justify-center w-[320px]">
        <div 
          className="flex flex-col items-center cursor-pointer transition-transform hover:scale-110"
          onClick={() => navigate('/')}
        >
          <BookOpen className="w-6 h-6 text-white" />
          <div className="text-white text-sm mt-1">STORIES</div>
          <div className="text-white text-xl font-bold">{stats.stories.value}</div>
        </div>
        <div className="flex flex-col items-center cursor-pointer transition-transform hover:scale-110">
          <BookText className="w-6 h-6 text-white" />
          <div className="text-white text-sm mt-1">GLOSSARY</div>
          <div className="text-white text-xl font-bold">{stats.glossary.value}</div>
        </div>
        <div 
          className="flex flex-col items-center cursor-pointer transition-transform hover:scale-110"
          onClick={() => navigate('/units')}
        >
          <GraduationCap className="w-6 h-6 text-white" />
          <div className="text-white text-sm mt-1">UNITS</div>
          <div className="text-white text-xl font-bold">{stats.units.value}</div>
        </div>
      </div>
    </div>
  );
};
