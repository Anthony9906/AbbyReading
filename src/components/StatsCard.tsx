"use client";

export const StatsCard = () => {
  return (
    <div className="w-[320px] bg-[#E8E5FA] rounded-[32px] p-8">
      <h2 className="text-[24px] font-bold text-[#1A1A1A] mb-6">Your MAP Level</h2>
      <div className="space-y-6">
        {/* MAP Growth Logo */}
        <div className="bg-white rounded-2xl p-4">
          <img 
            src="/images/map-growth.png" 
            alt="MAP Growth" 
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Lexiles Score */}
          <div className="bg-white rounded-2xl p-4 flex flex-col items-center">
            <div className="text-[#6B5ECD] text-[32px] font-bold leading-tight">210L</div>
            <div className="text-[#666666] text-[14px]">Lexiles</div>
          </div>

          {/* AR Score */}
          <div className="bg-[#6B5ECD] rounded-2xl p-4 flex flex-col items-center">
            <div className="text-white text-[32px] font-bold leading-tight">21</div>
            <div className="text-white text-[14px]">AR</div>
          </div>
        </div>
      </div>
    </div>
  );
};


