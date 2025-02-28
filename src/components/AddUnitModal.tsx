import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import { FileText, X, Loader2, Calendar, Upload } from "lucide-react";
import { PDFPreview } from "./PDFPreview";
import "../styles/components/AddUnitModal.css";

interface Unit {
  id: string;
  title: string;
  unit: string;
  week: string;
  type: string;
  begin_date?: string;
  end_date?: string;
  reading_file?: string | null;
  report_file?: string | null;
}

interface FileUploadState {
  file: File;
  progress: number;
  preview: string | null | undefined;
  path?: string;
}

interface AddUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUnit: (unitData: any) => Promise<void>;
  initialData?: Unit | null;
}

const FileUploadArea = ({ 
  onFileChange, 
  isUploading, 
  label 
}: { 
  onFileChange: (file: File) => void;
  isUploading: boolean;
  label: string;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files?.length) {
      onFileChange(files[0]);
    }
  }, [onFileChange]);

  return (
    <div
      className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => document.getElementById(`file-input-${label}`)?.click()}
    >
      {isUploading ? (
        <div className="upload-loading">
          <Loader2 className="upload-loader" />
          <span>Uploading...</span>
        </div>
      ) : (
        <>
          <Upload className="upload-icon" />
          <p className="upload-text">Drop your {label} here or click to browse</p>
          <span className="upload-hint">Supports PDF and image files</span>
        </>
      )}
      <input
        id={`file-input-${label}`}
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])}
        className="hidden-input"
      />
    </div>
  );
};

export const AddUnitModal = ({ isOpen, onClose, onAddUnit, initialData }: AddUnitModalProps) => {
  const [title, setTitle] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [week, setWeek] = useState("");
  const [type, setType] = useState("CET");
  const [beginDate, setBeginDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reading, setReading] = useState<FileUploadState | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<FileUploadState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadingUploading, setIsReadingUploading] = useState(false);
  const [isReportUploading, setIsReportUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'files'>('info');

  const getFileUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage
      .from('unit-files')
      .getPublicUrl(path);
    return data.publicUrl;
  };

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setUnitNumber(initialData.unit);
      setWeek(initialData.week);
      setType(initialData.type);
      setBeginDate(initialData.begin_date ? new Date(initialData.begin_date) : null);
      setEndDate(initialData.end_date ? new Date(initialData.end_date) : null);
      
      if (initialData.reading_file) {
        const fileUrl = getFileUrl(initialData.reading_file);
        setReading({ 
          file: new File([], "existing-reading"),
          preview: initialData.reading_file.toLowerCase().endsWith('.pdf') ? null : fileUrl,
          path: initialData.reading_file,
          progress: 100
        });
      }
      if (initialData.report_file) {
        const fileUrl = getFileUrl(initialData.report_file);
        setWeeklyReport({ 
          file: new File([], "existing-report"),
          preview: initialData.report_file.toLowerCase().endsWith('.pdf') ? null : fileUrl,
          path: initialData.report_file,
          progress: 100
        });
      }
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setTitle("");
    setUnitNumber("");
    setWeek("");
    setType("CET");
    setBeginDate(null);
    setEndDate(null);
    setReading(null);
    setWeeklyReport(null);
    setActiveTab('info');
  };

  const handleFileChange = useCallback(async (file: File, type: 'reading' | 'report') => {
    const setState = type === 'reading' ? setReading : setWeeklyReport;
    const currentFile = type === 'reading' ? reading : weeklyReport;
    const setUploading = type === 'reading' ? setIsReadingUploading : setIsReportUploading;
    
    if (currentFile?.file.name === file.name && 
        currentFile?.file.size === file.size && 
        currentFile?.file.lastModified === file.lastModified) {
      toast.error('This file has already been uploaded');
      return;
    }
    
    const preview = file.type.startsWith('image/') 
      ? URL.createObjectURL(file)
      : null;
    
    setState({ file, preview, progress: 0 });
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('unit-files')
        .upload(fileName, file);

      if (error) throw error;
      setState(prev => prev ? { ...prev, path: data.path } : null);
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      setState(null);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  }, [reading, weeklyReport]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 基本验证
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const unitData = {
        title,
        unit: unitNumber,
        week,
        type,
        begin_date: beginDate?.toISOString(),
        end_date: endDate?.toISOString(),
        reading_file: reading?.path || null,
        report_file: weeklyReport?.path || null
      };

      await onAddUnit(unitData);
      toast.success(initialData ? 'Unit updated successfully' : 'Unit created successfully');
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving unit:', error);
      toast.error(initialData ? 'Failed to update unit' : 'Failed to create unit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {isSubmitting && (
          <div className="loading-overlay">
            <Loader2 className="loading-spinner" />
            <span>{initialData ? 'Updating...' : 'Creating...'}</span>
          </div>
        )}

        <div className="modal-header">
          <h2 className="modal-title">
            {initialData ? 'Edit Unit' : 'Add New Unit'}
          </h2>
          <button 
            className="close-button"
            onClick={() => {
              onClose();
              resetForm();
            }}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-tabs">
          <button 
            className={`modal-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Unit Information
          </button>
          <button 
            className={`modal-tab ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            Learning Materials
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={`tab-content ${activeTab === 'info' ? 'active' : ''}`}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  placeholder="Enter unit title"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <input
                  type="text"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Unit 1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Week</label>
                <input
                  type="text"
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Week 1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="form-input"
                >
                  <option value="CET">CET</option>
                  <option value="FET">FET</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Begin Date</label>
                <div className="date-picker-wrapper">
                  <Calendar className="date-icon" size={16} />
                  <DatePicker
                    selected={beginDate}
                    onChange={date => setBeginDate(date)}
                    className="form-input date-input"
                    placeholderText="Select start date"
                    dateFormat="MMM d, yyyy"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <div className="date-picker-wrapper">
                  <Calendar className="date-icon" size={16} />
                  <DatePicker
                    selected={endDate}
                    onChange={date => setEndDate(date)}
                    className="form-input date-input"
                    placeholderText="Select end date"
                    dateFormat="MMM d, yyyy"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className={`tab-content ${activeTab === 'files' ? 'active' : ''}`}>
            <div className="file-upload-grid">
              <div className="upload-section">
                <label className="form-label">Reading Material</label>
                {reading ? (
                  <div className="file-preview">
                    <div className="preview-content">
                      {reading.preview ? (
                        <img 
                          src={reading.preview} 
                          alt="Preview" 
                          className="preview-image"
                        />
                      ) : reading.path?.toLowerCase().endsWith('.pdf') ? (
                        <div className="pdf-container">
                          <PDFPreview
                            url={getFileUrl(reading.path)!}
                            className="pdf-preview"
                            unitId={initialData?.id || ''}
                            unitTitle={initialData?.title || ''}
                            containerStyle="large"
                            fileType="reading"
                          />
                        </div>
                      ) : (
                        <FileText className="file-icon" />
                      )}
                    </div>
                    <div className="file-info">
                      <p className="file-name">
                        {reading.file.name === "existing-reading" 
                          ? reading.path?.split('/').pop() || ''
                          : reading.file.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReading(null)}
                      className="remove-file"
                    >
                      <X className="remove-icon" />
                    </button>
                  </div>
                ) : (
                  <FileUploadArea
                    onFileChange={(file) => handleFileChange(file, 'reading')}
                    isUploading={isReadingUploading}
                    label="Reading Material"
                  />
                )}
              </div>

              <div className="upload-section">
                <label className="form-label">Weekly Report</label>
                {weeklyReport ? (
                  <div className="file-preview">
                    <div className="preview-content">
                      {weeklyReport.preview ? (
                        <img 
                          src={weeklyReport.preview} 
                          alt="Preview" 
                          className="preview-image"
                        />
                      ) : weeklyReport.path?.toLowerCase().endsWith('.pdf') ? (
                        <div className="pdf-container">
                          <PDFPreview
                            url={getFileUrl(weeklyReport.path)!}
                            className="pdf-preview"
                            unitId={initialData?.id || ''}
                            unitTitle={initialData?.title || ''}
                            containerStyle="large"
                            fileType="report"
                          />
                        </div>
                      ) : (
                        <FileText className="file-icon" />
                      )}
                    </div>
                    <div className="file-info">
                      <p className="file-name">
                        {weeklyReport.file.name === "existing-report" 
                          ? weeklyReport.path?.split('/').pop() || ''
                          : weeklyReport.file.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWeeklyReport(null)}
                      className="remove-file"
                    >
                      <X className="remove-icon" />
                    </button>
                  </div>
                ) : (
                  <FileUploadArea
                    onFileChange={(file) => handleFileChange(file, 'report')}
                    isUploading={isReportUploading}
                    label="Weekly Report"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={isSubmitting}
              className="submit-button"
            >
              {initialData ? 'Update Unit' : 'Create Unit'}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              disabled={isSubmitting}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 