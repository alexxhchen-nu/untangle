import { useState } from 'react';

export default function ResultsTable({ tombs, onSelect, selectedId }) {
  const [sortBy, setSortBy] = useState('墓葬编号');
  const [sortDir, setSortDir] = useState('asc');
  const [filter, setFilter] = useState('');

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const sorted = [...tombs]
    .filter(t => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        t['墓葬编号']?.toLowerCase().includes(q) ||
        t['年代']?.toLowerCase().includes(q) ||
        t['墓葬形制']?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let va = a[sortBy] ?? '';
      let vb = b[sortBy] ?? '';
      if (sortBy === '随葬品数') {
        va = (a['随葬器物'] || []).length;
        vb = (b['随葬器物'] || []).length;
      }
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      va = String(va);
      vb = String(vb);
      return sortDir === 'asc' ? va.localeCompare(vb, 'zh') : vb.localeCompare(va, 'zh');
    });

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="text-earth-300 ml-1">⇅</span>;
    return <span className="text-bronze-600 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const columns = [
    { key: '墓葬编号', label: '编号' },
    { key: '年代', label: '年代' },
    { key: '墓葬形制', label: '形制' },
    { key: '墓口长', label: '长(m)' },
    { key: '墓口宽', label: '宽(m)' },
    { key: '墓深', label: '深(m)' },
    { key: '墓向', label: '方向' },
    { key: '随葬品数', label: '随葬品' },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-earth-100 flex items-center gap-4 bg-earth-50/50">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="搜索编号、年代、形制..."
          className="flex-1 max-w-xs px-3 py-1.5 border border-earth-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bronze-400 focus:border-transparent placeholder-earth-300"
        />
        <span className="text-sm text-earth-500">
          显示 {sorted.length} / {tombs.length} 条
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-earth-100/70 text-earth-600">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-earth-200/50 transition-colors whitespace-nowrap select-none"
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((tomb, idx) => {
              const id = tomb['墓葬编号'];
              const isSelected = id === selectedId;
              return (
                <tr
                  key={id + idx}
                  onClick={() => onSelect(tomb)}
                  className={`cursor-pointer transition-colors border-b border-earth-50 ${
                    isSelected
                      ? 'bg-bronze-50 border-l-4 border-l-bronze-500'
                      : 'hover:bg-earth-50'
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-earth-800 whitespace-nowrap">{id}</td>
                  <td className="px-3 py-2 text-earth-600">{tomb['年代'] || '—'}</td>
                  <td className="px-3 py-2 text-earth-600">{tomb['墓葬形制'] || '—'}</td>
                  <td className="px-3 py-2 text-earth-500 text-right">{tomb['墓口长'] ?? '—'}</td>
                  <td className="px-3 py-2 text-earth-500 text-right">{tomb['墓口宽'] ?? '—'}</td>
                  <td className="px-3 py-2 text-earth-500 text-right">{tomb['墓深'] ?? '—'}</td>
                  <td className="px-3 py-2 text-earth-500">{tomb['墓向'] || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      (tomb['随葬器物'] || []).length > 0
                        ? 'bg-bronze-100 text-bronze-700'
                        : 'bg-earth-100 text-earth-400'
                    }`}>
                      {(tomb['随葬器物'] || []).length}
                    </span>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-earth-400">
                  {filter ? '没有匹配的记录' : '未发现墓葬数据'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
