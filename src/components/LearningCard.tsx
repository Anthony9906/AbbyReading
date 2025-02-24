"use client";

import { School, BookOpenCheck, BrainCircuit } from "lucide-react";
import '../styles/components/LearningCard.css';

export const LearningCard = () => {
  return (
    <div className="learning-card">
      {/* 下拉选择器 */}
      <div className="select-container">
        <select className="level-select">
          <option value="1">I can do it</option>
          <option value="2">I can read it</option>
          <option value="3">I can write it</option>
        </select>
        <div className="select-arrow">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6L8 10L12 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* 主要内容卡片 */}
      <div className="content-card">
        <h2 className="content-title">I can do it</h2>
        <div className="content-sections">
          {/* Reading Section */}
          <div className="reading-section">
            <div className="story-text">
              I can tell a story about <span className="highlight">Grufflo</span> in the woods ! A mouse walking along the <span className="highlight">path</span> in the woods, foxoffer him a meat to share, the mouse refused.
            </div>
            <div className="tag reading">Reading</div>
          </div>

          {/* Vocabulary Section */}
          <div className="vocabulary-section">
            <div className="tag vocabulary">Vocabulary</div>
            <div className="word-cloud">
              {['kid', 'tournement', 'outside', 'be good at', 'soccer', 'hear', 'turn around', 'begin', 'sport', 'favorite'].map((word) => (
                <span key={word} className="word-tag">{word}</span>
              ))}
            </div>

            {/* Grammar Section */}
            <div className="grammar-section">
              <div className="tag vocabulary">Grammar</div>
              <div className="grammar-examples">
                <div className="example">
                  <span className="highlight">Do</span> you <span className="highlight">have</span> a pet cat ?
                </div>
                <div className="example">
                  <span className="highlight">What</span> does she <span className="highlight">have</span> for dinner ?
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部按钮组 */}
      <div className="action-buttons">
        <button className="action-button school">
          <School className="button-icon" />
          <span>In School</span>
        </button>
        <button className="action-button reading">
          <BookOpenCheck className="button-icon" />
          <span>AI Reading</span>
        </button>
        <button className="action-button quiz">
          <BrainCircuit className="button-icon" />
          <span>Small Quiz</span>
        </button>
      </div>
    </div>
  );
};
