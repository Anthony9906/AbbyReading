"use client";
import type { FC } from "react";
import { UserHeader } from "./UserHeader";
import { LearningCard } from "./LearningCard";
import { StatsCard } from "./StatsCard";
import { UserStats } from "./types";

const userStats: UserStats = {
  stories: {
    icon: "https://cdn.builder.io/api/v1/image/assets/7698e99ae5fd45348ab4fb99dc503337/761af0a10ff2cfa1564bd600e4ad2b8ae19a7b5de504035087218cc30963577d",
    label: "STORIES",
    value: 178,
  },
  glossary: {
    icon: "https://cdn.builder.io/api/v1/image/assets/7698e99ae5fd45348ab4fb99dc503337/1685789f739bf4177fd0f29a1063860b14c3756a9d914117d004d7203b425fa2",
    label: "GLOSSARY",
    value: 178,
  },
  units: {
    icon: "https://cdn.builder.io/api/v1/image/assets/7698e99ae5fd45348ab4fb99dc503337/bf16c33812147481259ef7eda38bb97698366cae054dac261e97d37ace5bdbc6",
    label: "UNITS",
    value: 178,
  },
};

export const Home: FC = () => {
  return (
    <main className="min-h-screen bg-[#6B5ECD]">
      <div className="px-6 py-6">
        <UserHeader
          avatar="https://cdn.builder.io/api/v1/image/assets/7698e99ae5fd45348ab4fb99dc503337/f1a3e4865601f7db3038bdd5060c63484c4816e365965acde33d018b420fba0a"
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
