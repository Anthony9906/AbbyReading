import { UserHeader } from "../components/UserHeader";
import { StatsCard } from "../components/StatsCard";
import { LearningCard } from "../components/LearningCard";

const userStats = {
  stories: { label: "STORIES", value: 178 },
  glossary: { label: "GLOSSARY", value: 45 },
  units: { label: "UNITS", value: 521 },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#6B5ECD] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <UserHeader 
          avatar="/images/avatar.svg"
          name="Abby"
          stats={userStats}
        />
        <div className="flex gap-6">
          <LearningCard />
          <StatsCard />
        </div>
      </div>
    </div>
  );
} 