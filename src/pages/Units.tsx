import { useState, useEffect } from "react";
import { UserHeader } from "../components/UserHeader";
import { StatsCard } from "../components/StatsCard";
import { Plus, FileText, FileImage, Settings2, BookOpen, Award, Star } from "lucide-react";
import { AddUnitModal } from "../components/AddUnitModal";
import { supabase } from "../lib/supabase";
import { PDFPreview } from "../components/PDFPreview";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { fetchUnitsPage, addUnit, editUnit } from "../redux/slices/unitsPageSlice";
import "../styles/pages/Units.css";

export default function Units() {
  const dispatch = useAppDispatch();
  const { units, status, error } = useAppSelector((state) => state.unitsPage);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any | null>(null);

  // 在组件挂载时获取单元数据
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchUnitsPage());
    }
  }, [dispatch, status]);

  const getFileUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage
      .from('unit-files')
      .getPublicUrl(path);
    return data.publicUrl;
  };

  // 获取单元类型对应的图标和颜色
  const getUnitTypeInfo = (type: string) => {
    switch (type.toLowerCase()) {
      case 'reading':
        return { icon: <BookOpen size={16} />, color: '#4CAF50' };
      case 'writing':
        return { icon: <FileText size={16} />, color: '#2196F3' };
      case 'speaking':
        return { icon: <Award size={16} />, color: '#FF9800' };
      default:
        return { icon: <Star size={16} />, color: '#9C27B0' };
    }
  };

  const handleAddUnit = async (unitData: any) => {
    try {
      await dispatch(addUnit(unitData)).unwrap();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding unit:', error);
    }
  };

  const handleEditUnit = async (unitData: any) => {
    try {
      await dispatch(editUnit({
        unitId: editingUnit?.id,
        unitData
      })).unwrap();
      setEditingUnit(null);
    } catch (error) {
      console.error('Error updating unit:', error);
    }
  };

  // 显示加载状态
  if (status === 'loading' && units.length === 0) {
    return (
      <div className="units-page loading">
        <div className="loading-spinner">Loading your learning adventures...</div>
      </div>
    );
  }

  // 显示错误信息
  if (status === 'failed' && error) {
    return (
      <div className="units-page error">
        <div className="error-message">Oops! Something went wrong: {error}</div>
      </div>
    );
  }

  return (
    <div className="units-page">
      <div className="units-container">
        <UserHeader 
          avatar="/images/avatar.svg"
          name="Abby"
          stats={{
            stories: { label: "STORIES", value: units.filter(u => u.story).length },
            glossary: { label: "GLOSSARY", value: 45 },
            units: { label: "UNITS", value: units.length },
          }}
        />
        
        <div className="content-wrapper">
          <div className="main-content">
            <div className="header-section">
              <h1 className="page-title">My Learning Units</h1>
              <button 
                className="add-button"
                onClick={() => setIsModalOpen(true)}
                title="Add new unit"
              >
                <Plus className="add-icon" />
              </button>
            </div>
            
            {units.length === 0 ? (
              <div className="empty-state">
                <img src="/images/empty-units.svg" alt="No units" className="empty-image" />
                <h3>No units yet</h3>
                <p>Start your learning journey by adding your first unit!</p>
              </div>
            ) : (
              <div className="units-list">
                {units.map((unit) => {
                  const typeInfo = getUnitTypeInfo(unit.type);
                  return (
                    <div key={unit.id} className="unit-card">
                      <div className="unit-content">
                        <div className="unit-info">
                          <h2 className="unit-title">{unit.title}</h2>
                          <div className="unit-tags">
                            <span className="tag">{unit.unit}</span>
                            <span className="tag">{unit.week}</span>
                            <span className="tag" style={{ backgroundColor: `${typeInfo.color}20`, color: typeInfo.color }}>
                              {typeInfo.icon}
                              <span className="tag-text">{unit.type}</span>
                            </span>
                          </div>
                        </div>
                        <button 
                          className="edit-button"
                          onClick={() => setEditingUnit(unit)}
                          title="Edit unit"
                        >
                          <Settings2 className="edit-icon" />
                        </button>
                        <div className="unit-status">
                          <div className="progress-section">
                            <div className="progress-label">Progress</div>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${unit.progress}%` }}
                              ></div>
                            </div>
                            <div className="progress-value">{unit.progress}%</div>
                          </div>
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
                                  <div className="preview-label">Reading</div>
                                </div>
                              ) : (
                                <div className="empty-preview">
                                  <FileImage className="placeholder-icon" />
                                  <div className="preview-label">Reading</div>
                                </div>
                              )}
                            </div>
                            <div className={`preview-box ${unit.weekly_report ? 'has-story' : ''}`}>
                              {unit.report_file ? (
                                <div className="preview-container">
                                  {unit.report_file.toLowerCase().endsWith('.pdf') ? (
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
                                  )}
                                  <div className="preview-label">Report</div>
                                </div>
                              ) : (
                                <div className="empty-preview">
                                  <FileText className="placeholder-icon" />
                                  <div className="preview-label">Report</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="stats-card-container">
            <StatsCard />
          </div>
        </div>
      </div>

      <AddUnitModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddUnit={handleAddUnit}
      />

      <AddUnitModal 
        isOpen={editingUnit !== null}
        onClose={() => setEditingUnit(null)}
        onAddUnit={handleEditUnit}
        initialData={editingUnit}
      />
    </div>
  );
} 