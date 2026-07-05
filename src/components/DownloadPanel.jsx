import { exportAsJSON, exportAsCSV, exportAsMarkdown } from '../api';

export default function DownloadPanel({ result }) {
  const name = result['报告名称'] || 'tombs';

  const buttons = [
    {
      label: 'JSON',
      desc: '结构化数据，适合程序处理',
      icon: '{ }',
      color: 'bg-emerald-600 hover:bg-emerald-500',
      action: () => exportAsJSON(result, name),
    },
    {
      label: 'CSV',
      desc: '表格数据，可用 Excel 打开',
      icon: '📊',
      color: 'bg-blue-600 hover:bg-blue-500',
      action: () => exportAsCSV(result),
    },
    {
      label: 'Markdown',
      desc: '文档格式，适合阅读和展示',
      icon: '📝',
      color: 'bg-purple-600 hover:bg-purple-500',
      action: () => exportAsMarkdown(result),
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-earth-100 p-4">
      <p className="text-sm text-earth-500 mb-3 font-medium">导出数据</p>
      <div className="flex flex-wrap gap-3">
        {buttons.map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md ${btn.color}`}
          >
            <span className="text-base">{btn.icon}</span>
            <span>{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
