import { useState, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import ResultsTable from './components/ResultsTable';
import TombDetail from './components/TombDetail';
import DownloadPanel from './components/DownloadPanel';
import { parseReport } from './api';

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTomb, setSelectedTomb] = useState(null);

  const handleUpload = useCallback(async (file, reportName) => {
    setLoading(true);
    setError('');
    setResult(null);
    setSelectedTomb(null);

    try {
      const data = await parseReport(file, reportName);
      setResult(data);
    } catch (err) {
      setError(err.message || '解析失败，请检查文件格式');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = () => {
    setResult(null);
    setError('');
    setSelectedTomb(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-earth-800 text-earth-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏺</span>
            <div>
              <h1 className="text-xl font-bold tracking-wide">考古文献解析</h1>
              <p className="text-earth-300 text-sm">墓葬数据自动提取工具</p>
            </div>
          </div>
          {result && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-earth-600 hover:bg-earth-500 rounded-lg text-sm font-medium transition-colors"
            >
              重新上传
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {!result && !loading && (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-earth-800 mb-2">
                上传考古发掘报告
              </h2>
              <p className="text-earth-600 max-w-xl mx-auto">
                支持 <code className="bg-earth-100 px-1.5 py-0.5 rounded text-sm">.md</code> 和{' '}
                <code className="bg-earth-100 px-1.5 py-0.5 rounded text-sm">.txt</code> 格式。
                系统将自动识别墓葬编号、形制、尺寸、随葬器物等信息，
                并生成结构化的 JSON、CSV、Markdown 数据。
              </p>
            </div>
            <FileUpload onUpload={handleUpload} loading={loading} />
            {error && (
              <div className="mt-6 max-w-xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-medium">解析出错</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}
            <div className="mt-12 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-earth-700 mb-4">使用说明</h3>
              <ol className="space-y-2 text-earth-600 text-sm list-decimal list-inside">
                <li>将 PDF 格式的考古报告转换为 Markdown 或 TXT（可用 MinerU 等工具）</li>
                <li>上传转换后的文件</li>
                <li>系统自动识别墓葬信息并展示结构化数据</li>
                <li>可下载 JSON、CSV 或 Markdown 格式的结果</li>
              </ol>
            </div>
          </>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-earth-200 border-t-earth-600 rounded-full animate-spin mb-4" />
            <p className="text-earth-600 text-lg">正在解析报告...</p>
            <p className="text-earth-400 text-sm mt-1">这可能需要几秒钟</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-earth-100 p-6">
              <div className="flex flex-wrap gap-6 text-center">
                <div className="flex-1 min-w-[120px]">
                  <p className="text-3xl font-bold text-bronze-600">{result['墓葬总数']}</p>
                  <p className="text-earth-500 text-sm">墓葬</p>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <p className="text-3xl font-bold text-bronze-600">{result['器物总数']}</p>
                  <p className="text-earth-500 text-sm">随葬器物</p>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <p className="text-lg font-medium text-earth-700 truncate">{result['报告名称']}</p>
                  <p className="text-earth-500 text-sm">报告名称</p>
                </div>
              </div>
            </div>

            {/* Download panel */}
            <DownloadPanel result={result} />

            {/* Results */}
            <div className="bg-white rounded-xl shadow-sm border border-earth-100 overflow-hidden">
              <ResultsTable
                tombs={result['墓葬列表'] || []}
                onSelect={setSelectedTomb}
                selectedId={selectedTomb?.['墓葬编号']}
              />
            </div>

            {/* Detail panel */}
            {selectedTomb && (
              <TombDetail
                tomb={selectedTomb}
                onClose={() => setSelectedTomb(null)}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-earth-800 text-earth-400 text-center py-4 text-sm">
        <p>考古文献解析工具 — 用于学术研究</p>
      </footer>
    </div>
  );
}
