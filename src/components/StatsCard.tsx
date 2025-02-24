"use client";

import '../styles/components/StatsCard.css';

export const StatsCard = () => {
  return (
    <div className="stats-card">
      <h2 className="card-title">Your MAP Level</h2>
      <div className="card-content">
        {/* MAP Growth Logo */}
        <div className="map-logo">
          <img 
            src="/images/map-growth.png" 
            alt="MAP Growth" 
            className="logo-image"
          />
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {/* Lexiles Score */}
          <div className="stat-box lexiles">
            <div className="stat-value">210L</div>
            <div className="stat-label">Lexiles</div>
          </div>

          {/* AR Score */}
          <div className="stat-box ar">
            <div className="stat-value">21</div>
            <div className="stat-label">AR</div>
          </div>
        </div>
      </div>
    </div>
  );
};


