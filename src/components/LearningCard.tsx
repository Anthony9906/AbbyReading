"use client";

export const LearningCard = () => {
  return (
    <div className="flex-1 bg-[#8175D6] rounded-3xl p-6">
      {/* 下拉选择器 */}
      <select className="px-4 py-2 rounded-full bg-[#8175D6] text-white border border-white mb-4">
        <option>I can do it</option>
      </select>

      {/* 主要内容 */}
      <h2 className="text-3xl font-bold text-white mb-4">I can do it</h2>
      <div className="space-y-4">
        {/* Reading Section */}
        <div>
          <div className="text-white mb-2">
            I can tell a story about <span className="text-[#FFA07A]">Grufflo</span> in the woods ! A mouse walking along the <span className="text-[#FFA07A]">path</span> in the woods, foxoffer him a meat to share, the mouse refused.
          </div>
          <div className="inline-block bg-[#6B5ECD] text-white px-3 py-1 rounded-full">Reading</div>
        </div>

        {/* Vocabulary Section */}
        <div>
          <div className="inline-block bg-green-500 text-white px-3 py-1 rounded-full mb-2">Vocabulary</div>
          <div className="flex flex-wrap gap-2 text-white">
            {['kid', 'tournement', 'outside', 'be good at', 'soccer', 'hear', 'turn around', 'begin', 'sport', 'favorite'].map((word) => (
              <span key={word} className="bg-[#6B5ECD] px-3 py-1 rounded-full">{word}</span>
            ))}
          </div>
        </div>

        {/* Grammar Section */}
        <div>
          <div className="inline-block bg-green-500 text-white px-3 py-1 rounded-full mb-2">Grammar</div>
          <div className="text-white">
            <div><span className="text-[#FFA07A]">Do</span> you <span className="text-[#FFA07A]">have</span> a pet cat ?</div>
            <div><span className="text-[#FFA07A]">What</span> does she <span className="text-[#FFA07A]">have</span> for dinner ?</div>
          </div>
        </div>
      </div>

      {/* 底部按钮组 */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <button className="bg-[#8BC34A] text-white py-3 rounded-xl">In School</button>
        <button className="bg-[#B39DDB] text-white py-3 rounded-xl">AI Reading</button>
        <button className="bg-[#81D4FA] text-white py-3 rounded-xl">Small Quiz</button>
      </div>
    </div>
  );
};
