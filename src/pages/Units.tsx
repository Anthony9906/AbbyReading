import { useState, useEffect } from "react";
import { UserHeader } from "../components/UserHeader";
import { StatsCard } from "../components/StatsCard";
import { Plus, FileText, FileImage, Settings2 } from "lucide-react";
import { AddUnitModal } from "../components/AddUnitModal";
import { supabase } from "../lib/supabase";
import { PDFPreview } from "../components/PDFPreview";
import "../styles/pages/Units.css";

interface Unit {
  id: string;
  title: string;
  unit: string;
  week: string;
  type: string;
  reading_file: string | null;
  report_file: string | null;
  progress: number;
  stories?: Array<{
    content: string;
  }>;
  story?: {
    content: string;
  } | null;
  weekly_report?: {
    original_text: string;
  } | null;
}

export default function Units() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('units')
        .select(`
          *,
          stories (
            content,
            type
          ),
          weekly_report (
            original_text
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 处理数据，找到每个 unit 的 inclass 类型故事和周报
      const unitsWithData = data?.map(unit => ({
        ...unit,
        story: unit.stories?.find((story: { type: string }) => story.type === 'inclass') || null,
        weekly_report: unit.weekly_report?.[0] || null
      }));

      setUnits(unitsWithData || []);
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

  const handleAddUnit = async (unitData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('units')
        .insert([
          {
            ...unitData,
            user_id: user?.id
          }
        ]);

      if (error) throw error;
      fetchUnits(); // 刷新列表
    } catch (error) {
      console.error('Error adding unit:', error);
    }
  };

  const handleEditUnit = async (unitData: any) => {
    try {
      const { error } = await supabase
        .from('units')
        .update(unitData)
        .eq('id', editingUnit?.id);

      if (error) throw error;
      fetchUnits();
      setEditingUnit(null);
    } catch (error) {
      console.error('Error updating unit:', error);
    }
  };

  return (
    <div className="units-page">
      <div className="units-container">
        <UserHeader 
          avatar="/images/avatar.svg"
          name="Abby"
          stats={userStats}
        />
        
        <div className="content-wrapper">
          <div className="main-content">
            <button 
              className="add-button"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="add-icon" />
            </button>

            <h1 className="page-title">Units</h1>
            
            <div className="units-list">
              {units.map((unit) => (
                <div key={unit.id} className="unit-card">
                  <div className="unit-content">
                    <div className="unit-info">
                      <h2 className="unit-title">{unit.title}</h2>
                      <div className="unit-tags">
                        <span className="tag">{unit.unit}</span>
                        <span className="tag">{unit.week}</span>
                        <span className="tag">{unit.type}</span>
                      </div>
                    </div>
                    <button 
                      className="edit-button"
                      onClick={() => setEditingUnit(unit)}
                    >
                      <Settings2 className="edit-icon" />
                    </button>
                    <div className="unit-status">
                      <div className="progress">{unit.progress}%</div>
                      <div className="file-previews">
                        <div className={`preview-box ${unit.story ? 'has-story' : ''}`}>
                          {unit.reading_file ? (
                            <div className="preview-container">
                              {unit.reading_file.toLowerCase().endsWith('.pdf') ? (
                                <PDFPreview 
                                  url={getFileUrl(unit.reading_file)!} 
                                  className="preview"
                                  unitId={unit.id}
                                  unitTitle={unit.title}
                                  containerStyle="small"
                                  existingStory={unit.story?.content}
                                  fileType="reading"
                                  width={100}
                                  height={100}
                                />
                              ) : (
                                <img 
                                  src={getFileUrl(unit.reading_file)!} 
                                  alt="Reading" 
                                  className="preview"
                                />
                              )}
                            </div>
                          ) : (
                            <FileImage className="placeholder-icon" />
                          )}
                        </div>
                        <div className={`preview-box ${unit.weekly_report ? 'has-story' : ''}`}>
                          {unit.report_file ? (
                            unit.report_file.toLowerCase().endsWith('.pdf') ? (
                              <PDFPreview 
                                url={getFileUrl(unit.report_file)!} 
                                className="preview"
                                unitId={unit.id}
                                unitTitle={unit.title}
                                containerStyle="small"
                                existingStory={unit.weekly_report?.original_text}
                                fileType="report"
                                width={100}
                                height={100}
                              />
                            ) : (
                              <img 
                                src={getFileUrl(unit.report_file)!} 
                                alt="Report" 
                                className="preview"
                              />
                            )
                          ) : (
                            <FileText className="placeholder-icon" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <StatsCard />
        </div>
      </div>

      <AddUnitModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchUnits();
        }}
        onAddUnit={handleAddUnit}
      />

      <AddUnitModal 
        isOpen={editingUnit !== null}
        onClose={() => {
          setEditingUnit(null);
          fetchUnits();
        }}
        onAddUnit={handleEditUnit}
        initialData={editingUnit}
      />
    </div>
  );
} 