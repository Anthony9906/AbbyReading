"use client";

export const StatsCard = () => {
  return (
    <div className="w-[400px] bg-white rounded-3xl p-6">
      <h2 className="text-xl font-bold mb-4">Your MAP Level</h2>
      <div className="space-y-4">
        <img 
          src="https://cdn.builder.io/api/v1/image/assets/7698e99ae5fd45348ab4fb99dc503337/e389aaff16e07f33c5d07c0cc8a0c2f1" 
          alt="MAP Growth" 
          className="w-full h-auto object-contain"
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold">210L</div>
            <div className="text-gray-600">Lexiles</div>
          </div>
          <div className="text-center bg-[#6B5ECD] text-white rounded-xl p-4">
            <div className="text-4xl font-bold">21</div>
            <div>AR</div>
          </div>
        </div>
      </div>
    </div>
  );
};
