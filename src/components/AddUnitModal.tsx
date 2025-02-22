import { FC, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import { FileText, X, Loader2 } from "lucide-react";

interface AddUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FileUploadState {
  file: File;
  progress: number;
  preview: string | null | undefined;
  path?: string;
}

export const AddUnitModal: FC<AddUnitModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [week, setWeek] = useState("");
  const [type, setType] = useState("CET");
  const [beginDate, setBeginDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reading, setReading] = useState<FileUploadState | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<FileUploadState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadingUploading, setIsReadingUploading] = useState(false);
  const [isReportUploading, setIsReportUploading] = useState(false);

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
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('units')
        .insert([{
          title, unit, week, type,
          begin_date: beginDate?.toISOString(),
          end_date: endDate?.toISOString(),
          reading_file: reading?.path,
          report_file: weeklyReport?.path
        }]);

      if (error) throw error;
      toast.success('Unit created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating unit:', error);
      toast.error('Failed to create unit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-8 w-[800px] max-h-[90vh] overflow-y-auto relative">
        {isSubmitting && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#6B5ECD] animate-spin" />
          </div>
        )}

        <h2 className="text-2xl font-bold mb-6">Add New Unit</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Week</label>
              <input
                type="text"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="CET">CET</option>
                <option value="FET">FET</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Begin Date</label>
              <DatePicker
                selected={beginDate}
                onChange={date => setBeginDate(date)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <DatePicker
                selected={endDate}
                onChange={date => setEndDate(date)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>

          {/* 文件上传区域 */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Reading</label>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0], 'reading')}
                    className="w-full p-2 border rounded-lg"
                  />
                  {isReadingUploading && (
                    <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-[#6B5ECD] animate-spin" />
                    </div>
                  )}
                </div>
                {reading && (
                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                    {reading.preview ? (
                      <img src={reading.preview} alt="Preview" className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <FileText className="w-10 h-10" />
                    )}
                    <span className="max-w-[200px] truncate">{reading.file.name}</span>
                    <button
                      type="button"
                      onClick={() => setReading(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Weekly Report</label>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0], 'report')}
                    className="w-full p-2 border rounded-lg"
                  />
                  {isReportUploading && (
                    <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-[#6B5ECD] animate-spin" />
                    </div>
                  )}
                </div>
                {weeklyReport && (
                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                    {weeklyReport.preview ? (
                      <img src={weeklyReport.preview} alt="Preview" className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <FileText className="w-10 h-10" />
                    )}
                    <span className="max-w-[200px] truncate">{weeklyReport.file.name}</span>
                    <button
                      type="button"
                      onClick={() => setWeeklyReport(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#8BC34A] text-white py-3 rounded-xl disabled:opacity-50"
            >
              Create
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-[#B39DDB] text-white py-3 rounded-xl disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 