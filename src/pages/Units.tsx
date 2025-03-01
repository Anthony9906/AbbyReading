import { useState, useEffect } from "react";
import { UserHeader } from "../components/UserHeader";
import { StatsCard } from "../components/StatsCard";
import { Plus, FileText, FileImage, Settings2, BookOpen, Award, Star, Calendar, CheckCircle, BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import { AddUnitModal } from "../components/AddUnitModal";
import { supabase } from "../lib/supabase";
import { PDFPreview } from "../components/PDFPreview";
import { PDFViewerModal } from "../components/PDFViewerModal";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { fetchUnitsPage, addUnit, editUnit } from "../redux/slices/unitsPageSlice";
import "../styles/pages/Units.css";
import { ErrorMessage } from "../components/ErrorMessage";
import { PageLoader } from "../components/PageLoader";

export default function Units() {
  const dispatch = useAppDispatch();
  const { units, status, error } = useAppSelector((state) => state.unitsPage);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any | null>(null);
  const [activePreviewTabs, setActivePreviewTabs] = useState<Record<string, 'reading' | 'report'>>({});
  
  // 添加 PDFViewerModal 的状态
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<{
    url: string;
    title: string;
    unitId: string;
    fileType: string;
  } | null>(null);

  // 在组件挂载时获取单元数据
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchUnitsPage());
    }
    
    // 初始化所有单元的预览标签为 'reading'
    if (units.length > 0) {
      const initialTabs: Record<string, 'reading' | 'report'> = {};
      units.forEach(unit => {
        initialTabs[unit.id] = 'reading';
      });
      setActivePreviewTabs(initialTabs);
    }
  }, [dispatch, status, units.length]);

  // 显示加载状态
  if (status === 'loading' && units.length === 0) {
    return <PageLoader message="Loading your learning units..." />;
  }

  // 显示错误信息
  if (status === 'failed' && error) {
    return (
      <div className="units-page error">
        <div className="error-message">Oops! Something went wrong: {error}</div>
      </div>
    );
  }
  
  const getFileUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage
      .from('unit-files')
      .getPublicUrl(path);
    return data.publicUrl;
  };

  // 处理 PDF 预览点击事件
  const handlePdfPreviewClick = (url: string, unitId: string, unitTitle: string, fileType: string) => {
    setSelectedPdf({
      url,
      title: unitTitle,
      unitId,
      fileType
    });
    setPdfViewerOpen(true);
  };

  // 关闭 PDF 查看器
  const handleClosePdfViewer = () => {
    setPdfViewerOpen(false);
  };

  // 获取单元类型对应的图标和颜色
  const getUnitTypeInfo = (type: string) => {
    switch (type.toLowerCase()) {
      case 'reading':
        return { icon: <BookOpen size={12} />, color: '#4CAF50' };
      case 'writing':
        return { icon: <FileText size={12} />, color: '#2196F3' };
      case 'speaking':
        return { icon: <Award size={12} />, color: '#FF9800' };
      default:
        return { icon: <Star size={12} />, color: '#9C27B0' };
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

  const togglePreviewTab = (unitId: string) => {
    setActivePreviewTabs(prev => ({
      ...prev,
      [unitId]: prev[unitId] === 'reading' ? 'report' : 'reading'
    }));
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
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
    return <ErrorMessage message={error} onRetry={() => dispatch(fetchUnitsPage())} />;
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
              <div className="course-units-grid">
                {units.map((unit) => {
                  const typeInfo = getUnitTypeInfo(unit.type);
                  const activeTab = activePreviewTabs[unit.id] || 'reading';
                  
                  return (
                    <div key={unit.id} className="course-unit-card">
                      {/* 上半部分：预览区域 */}
                      <div className="unit-preview-section">
                        <div className="preview-tabs">
                          <button 
                            className={`preview-tab ${activeTab === 'reading' ? 'active' : ''}`}
                            onClick={() => setActivePreviewTabs({...activePreviewTabs, [unit.id]: 'reading'})}
                          >
                            Reading
                          </button>
                          <button 
                            className={`preview-tab ${activeTab === 'report' ? 'active' : ''}`}
                            onClick={() => setActivePreviewTabs({...activePreviewTabs, [unit.id]: 'report'})}
                          >
                            Report
                          </button>
                        </div>
                        
                        <div className="preview-content">
                          {activeTab === 'reading' ? (
                            unit.reading_file ? (
                              <div className="file-preview">
                                <PDFPreview 
                                  url={getFileUrl(unit.reading_file)!} 
                                  unitId={unit.id}
                                  unitTitle={unit.title}
                                  containerStyle="large"
                                  fileType="reading"
                                  className="preview-box clickable"
                                  onCustomClick={() => handlePdfPreviewClick(
                                    getFileUrl(unit.reading_file)!, 
                                    unit.id, 
                                    unit.title,
                                    "reading"
                                  )}
                                  width={280}
                                  height={180}
                                />
                                {unit.story && (
                                  <div className="has-content-badge">
                                    <CheckCircle size={14} />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="empty-preview">
                                <FileImage size={40} />
                                <p>No reading material</p>
                              </div>
                            )
                          ) : (
                            unit.report_file ? (
                              <div className="file-preview">
                                <PDFPreview 
                                  url={getFileUrl(unit.report_file)!} 
                                  unitId={unit.id}
                                  unitTitle={unit.title}
                                  containerStyle="large"
                                  fileType="report"
                                  className="preview-box clickable"
                                  onCustomClick={() => handlePdfPreviewClick(
                                    getFileUrl(unit.report_file)!, 
                                    unit.id, 
                                    unit.title,
                                    "report"
                                  )}
                                  width={280}
                                  height={180}
                                />
                                {unit.weekly_report && (
                                  <div className="has-content-badge">
                                    <CheckCircle size={14} />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="empty-preview">
                                <FileText size={40} />
                                <p>No report material</p>
                              </div>
                            )
                          )}
                        </div>
                        
                        <div className="preview-navigation">
                          <button 
                            className="nav-button"
                            onClick={() => togglePreviewTab(unit.id)}
                          >
                            {activeTab === 'reading' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                          </button>
                        </div>
                      </div>
                      
                      {/* 中部：标题和单元信息 */}
                      <div className="unit-info-section">
                        <h2 className="unit-title">{unit.title}</h2>
                        <div className="unit-tags">
                          <span className="unit-tag">{unit.unit}</span>
                          <span className="unit-tag">{unit.week}</span>
                          <span 
                            className="unit-tag type-tag" 
                            style={{ 
                              backgroundColor: `${typeInfo.color}20`, 
                              color: typeInfo.color 
                            }}
                          >
                            {typeInfo.icon}
                            <span>{unit.type}</span>
                          </span>
                        </div>
                      </div>
                      
                      {/* 底部：统计信息和操作 */}
                      <div className="unit-stats-section">
                        <div className="unit-dates">
                          <div className="date-item">
                            <Calendar size={14} />
                            <span>{formatDate(unit.begin_date || '')}</span>
                          </div>
                          <span className="date-separator">-</span>
                          <div className="date-item">
                            <Calendar size={14} />
                            <span>{formatDate(unit.end_date || '')}</span>
                          </div>
                        </div>
                        
                        <div className="unit-quiz-stats">
                          <div className="quiz-stat">
                            <CheckCircle size={14} />
                            <span> {unit.quiz_count || 0}</span>
                          </div>
                          <div className="quiz-stat">
                            <BarChart2 size={14} />
                            <span> {unit.quiz_accuracy || 0}%</span>
                          </div>
                        </div>
                        
                        <button 
                          className="edit-unit-button"
                          onClick={() => setEditingUnit(unit)}
                        >
                          <Settings2 size={16} />
                          <span>Edit</span>
                        </button>
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

      {/* PDF 查看器模态框 */}
      {pdfViewerOpen && selectedPdf && (
        <PDFViewerModal
          isOpen={pdfViewerOpen}
          onClose={handleClosePdfViewer}
          url={selectedPdf.url}
          unitId={selectedPdf.unitId}
          unitTitle={selectedPdf.title}
          fileType={selectedPdf.fileType as 'reading' | 'report'}
        />
      )}
    </div>
  );
} 