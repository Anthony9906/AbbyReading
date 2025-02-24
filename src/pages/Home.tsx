import { UserHeader } from "../components/UserHeader";
import { StatsCard } from "../components/StatsCard";
import { LearningCard } from "../components/LearningCard";
import "../styles/pages/Home.css";

const userStats = {
  stories: { label: "STORIES", value: 178 },
  glossary: { label: "GLOSSARY", value: 45 },
  units: { label: "UNITS", value: 521 },
};

export default function Home() {
  return (
    <div className="home-page">
      <div className="home-container">
        <UserHeader 
          avatar="/images/avatar.svg"
          name="Abby"
          stats={userStats}
        />
        <div className="cards-container">
          <LearningCard />
          <StatsCard />
        </div>
      </div>
    </div>
  );
} 