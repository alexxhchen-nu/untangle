import { useState, useRef, useCallback } from 'react';

export default function FileUpload({ onUpload, loading }) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [reportName, setReportName] = useState('');
  const inputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.match(/\.(md|txt)$/i)) {
      alert('仅支持 .md 或 .txt 格式文件');
      return;
    }
    setFileName(file.name);
    if (!reportName) {
      setReportName(file.name.replace(/\.(md|txt)$/i, ''));
    }
    onUpload(file, reportName || file.name.replace(/\.(md|txt)$/i, ''));
  }, [onUpload, reportName]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (inputRef.current?.files?.[0]) {
      handleFile(inputRef.current.files[0]);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Report name input */}
      <div>
        <label className="block text-sm font-medium text-earth-700 mb-1">
          报告名称（可选）
        </label>
        <input
          type="text"
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
          placeholder="例如：洛阳烧沟汉墓"
          className="w-full px-4 py-2.5 border border-earth-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-bronze-400 focus:border-transparent placeholder-earth-300"
        />
      </div>

      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-bronze-500 bg-bronze-50 scale-[1.02]'
            : 'border-earth-300 bg-white hover:border-bronze-400 hover:bg-earth-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".md,.txt"
          onChange={handleChange}
          className="hidden"
        />

        <div className="space-y-3">
          <div className="text-5xl">📄</div>
          <p className="text-lg font-medium text-earth-700">
            {dragActive ? '松开即可上传' : '拖拽文件到此处'}
          </p>
          <p className="text-sm text-earth-500">
            或点击选择文件（.md / .txt）
          </p>
        </div>

        {fileName && (
          <div className="mt-4 inline-flex items-center gap-2 bg-earth-100 px-3 py-1.5 rounded-lg text-sm text-earth-700">
            <span>📎</span>
            <span>{fileName}</span>
          </div>
        )}
      </div>

      {/* Upload button */}
      <button
        onClick={handleSubmit}
        disabled={loading || !fileName}
        className={`w-full py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
          loading || !fileName
            ? 'bg-earth-200 text-earth-400 cursor-not-allowed'
            : 'bg-bronze-600 text-white hover:bg-bronze-500 shadow-md hover:shadow-lg'
        }`}
      >
        {loading ? '解析中...' : '开始解析'}
      </button>
    </div>
  );
}
