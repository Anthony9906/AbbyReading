"use client";
import type { FC } from "react";
import { UserHeader } from "./UserHeader";
import { LearningCard } from "./LearningCard";
import { StatsCard } from "./StatsCard";
import { UserStats } from "./types";

const userStats: UserStats = {
  stories: {
    label: "STORIES",
    value: 178,
  },
  glossary: {
    label: "GLOSSARY",
    value: 178,
  },
  units: {
    label: "UNITS",
    value: 178,
  },
};

export const Home: FC = () => {
  return (
    <main className="min-h-screen bg-[#6B5ECD]">
      <div className="px-6 py-6">
        <UserHeader
          avatar="/images/avatar.svg"
          name="Abby"
          stats={userStats}
        />
        
        <div className="flex gap-6 mt-6 max-lg:flex-col">
          <LearningCard />
          <StatsCard />
        </div>
      </div>
    </main>
  );
};

export default Home;
