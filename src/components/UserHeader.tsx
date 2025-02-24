"use client";
import { FC } from "react";
import { BookOpen, BookText, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/components/UserHeader.css";

interface UserHeaderProps {
  avatar: string;
  name: string;
  stats: {
    stories: { label: string; value: number };
    glossary: { label: string; value: number };
    units: { label: string; value: number };
  };
}

export const UserHeader: FC<UserHeaderProps> = ({ avatar, name, stats }) => {
  const navigate = useNavigate();

  return (
    <div className="user-header">
      <div className="user-info">
        <img src={avatar} alt={name} className="avatar" />
        <div className="name-container">
          <div className="greeting">GOOD MORNING</div>
          <div className="username">{name}</div>
        </div>
      </div>

      <div className="stats-container">
        <div 
          className="stat-item"
          onClick={() => navigate('/home')}
        >
          <BookOpen className="stat-icon" />
          <div className="stat-label">STORIES</div>
          <div className="stat-value">{stats.stories.value}</div>
        </div>
        <div className="stat-item">
          <BookText className="stat-icon" />
          <div className="stat-label">GLOSSARY</div>
          <div className="stat-value">{stats.glossary.value}</div>
        </div>
        <div 
          className="stat-item"
          onClick={() => navigate('/units')}
        >
          <GraduationCap className="stat-icon" />
          <div className="stat-label">UNITS</div>
          <div className="stat-value">{stats.units.value}</div>
        </div>
      </div>
    </div>
  );
};
