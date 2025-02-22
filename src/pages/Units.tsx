import { useState, useEffect } from "react";
import { UserHeader } from "../components/UserHeader";
import { StatsCard } from "../components/StatsCard";
import { Plus, FileText, FileImage } from "lucide-react";
import { AddUnitModal } from "../components/AddUnitModal";
import { supabase } from "../lib/supabase";
import { PDFPreview } from "../components/PDFPreview";

interface Unit {
  id: string;
  title: string;
  unit: string;
  week: string;
  type: string;
  reading_file: string | null;
  report_file: string | null;
  progress: number;
}

export default function Units() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const getFileUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage
      .from('unit-files')
      .getPublicUrl(path);
    return data.publicUrl;
  };

  const userStats = {
    stories: { label: "STORIES", value: 178 },
    glossary: { label: "GLOSSARY", value: 45 },
    units: { label: "UNITS", value: 521 },
  };

  return (
    <div className="min-h-screen bg-[#6B5ECD] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <UserHeader 
          avatar="/images/avatar.svg"
          name="Abby"
          stats={userStats}
        />
        
        <div className="flex gap-6">
          {/* 左侧内容区 */}
          <div className="flex-1 bg-[#8175D6] rounded-3xl p-8 relative">
            {/* 添加按钮 */}
            <button 
              className="absolute left-8 top-8 w-12 h-12 bg-[#6B5ECD] rounded-full flex items-center justify-center"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-6 h-6 text-white" />
            </button>

            <h1 className="text-3xl font-bold text-white mb-6 ml-20">Units</h1>
            
            {/* Unit 列表 */}
            <div className="space-y-4">
              {units.map((unit) => (
                <div key={unit.id} className="bg-[#6B5ECD] rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-white mb-4">{unit.title}</h2>
                      <div className="flex gap-2">
                        <span className="bg-[#4CAF50] text-white px-3 py-1 rounded-full text-sm">{unit.unit}</span>
                        <span className="bg-[#4CAF50] text-white px-3 py-1 rounded-full text-sm">{unit.week}</span>
                        <span className="bg-[#4CAF50] text-white px-3 py-1 rounded-full text-sm">{unit.type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-white font-bold">{unit.progress}%</div>
                      <div className="flex gap-2">
                        {/* Reading 文件预览 */}
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                          {unit.reading_file ? (
                            unit.reading_file.toLowerCase().endsWith('.pdf') ? (
                              <PDFPreview url={getFileUrl(unit.reading_file)!} className="w-full h-full" />
                            ) : (
                              <img 
                                src={getFileUrl(unit.reading_file)!} 
                                alt="Reading" 
                                className="w-full h-full object-cover"
                              />
                            )
                          ) : (
                            <FileText className="w-8 h-8 text-[#6B5ECD]" />
                          )}
                        </div>
                        {/* Weekly Report 文件预览 */}
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                          {unit.report_file ? (
                            unit.report_file.toLowerCase().endsWith('.pdf') ? (
                              <PDFPreview url={getFileUrl(unit.report_file)!} className="w-full h-full" />
                            ) : (
                              <img 
                                src={getFileUrl(unit.report_file)!} 
                                alt="Report" 
                                className="w-full h-full object-cover"
                              />
                            )
                          ) : (
                            <FileImage className="w-8 h-8 text-[#6B5ECD]" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧统计卡片 */}
          <StatsCard />
        </div>
      </div>

      <AddUnitModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchUnits(); // 关闭模态框后刷新列表
        }}
      />
    </div>
  );
} 