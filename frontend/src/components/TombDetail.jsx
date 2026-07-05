export default function TombDetail({ tomb, onClose }) {
  const artifacts = tomb['随葬器物'] || [];

  const fields = [
    ['墓葬编号', tomb['墓葬编号']],
    ['年代', tomb['年代']],
    ['墓向', tomb['墓向']],
    ['墓葬形制', tomb['墓葬形制']],
    ['墓口长', tomb['墓口长'] ? `${tomb['墓口长']}m` : ''],
    ['墓口宽', tomb['墓口宽'] ? `${tomb['墓口宽']}m` : ''],
    ['墓深', tomb['墓深'] ? `${tomb['墓深']}m` : ''],
    ['发掘位置', tomb['发掘位置']],
    ['层位', tomb['层位']],
    ['备注', tomb['备注']],
  ].filter(([, v]) => v);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-earth-100 overflow-hidden">
      {/* Header */}
      <div className="bg-earth-100/50 px-6 py-4 flex items-center justify-between border-b border-earth-100">
        <h3 className="text-lg font-bold text-earth-800">
          {tomb['墓葬编号']}
          {tomb['年代'] && (
            <span className="ml-2 text-sm font-normal text-earth-500">（{tomb['年代']}）</span>
          )}
        </h3>
        <button
          onClick={onClose}
          className="text-earth-400 hover:text-earth-600 text-xl leading-none px-2 transition-colors"
        >
          ×
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Basic info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {fields.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-earth-400 mb-0.5">{label}</p>
              <p className="text-sm font-medium text-earth-700">{value}</p>
            </div>
          ))}
        </div>

        {/* Artifacts */}
        {artifacts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-earth-700 mb-3">
              随葬器物 <span className="text-earth-400 font-normal">({artifacts.length}件)</span>
            </h4>
            <div className="overflow-x-auto custom-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-earth-50 text-earth-500">
                    <th className="px-3 py-2 text-left font-medium">编号</th>
                    <th className="px-3 py-2 text-left font-medium">名称</th>
                    <th className="px-3 py-2 text-left font-medium">材质</th>
                    <th className="px-3 py-2 text-left font-medium">器型</th>
                    <th className="px-3 py-2 text-right font-medium">数量</th>
                    <th className="px-3 py-2 text-left font-medium">特征描述</th>
                  </tr>
                </thead>
                <tbody>
                  {artifacts.map((a, i) => (
                    <tr key={i} className="border-t border-earth-50">
                      <td className="px-3 py-2 text-earth-600 font-mono text-xs">{a['器物编号']}</td>
                      <td className="px-3 py-2 font-medium text-earth-700">{a['器物名称']}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block bg-earth-100 text-earth-600 px-2 py-0.5 rounded text-xs">
                          {a['材质'] || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-earth-600">{a['器型'] || '—'}</td>
                      <td className="px-3 py-2 text-right text-earth-600">{a['数量'] ?? '—'}</td>
                      <td className="px-3 py-2 text-earth-500 text-xs max-w-xs">
                        {a['特征描述'] || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {artifacts.length === 0 && (
          <p className="text-sm text-earth-400 italic">该墓葬无随葬器物记录</p>
        )}
      </div>
    </div>
  );
}
