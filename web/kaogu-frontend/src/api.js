const API_BASE = import.meta.env.VITE_API_URL || '';

export async function parseReport(file, reportName = '') {
  const formData = new FormData();
  formData.append('file', file);
  if (reportName) {
    formData.append('report_name', reportName);
  }

  const res = await fetch(`${API_BASE}/api/parse`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '请求失败' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsJSON(data, reportName) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `${reportName}_tombs.json`);
}

export function exportAsCSV(parserResult) {
  // Generate CSV client-side from the JSON result
  const tombs = parserResult['墓葬列表'] || [];
  const headers = [
    '墓葬编号', '年代', '墓向', '墓葬形制', '墓口长', '墓口宽', '墓深',
    '发掘位置', '层位', '备注',
    '器物编号', '器物名称', '材质', '器型', '数量', '特征描述'
  ];

  const rows = [headers.join(',')];
  for (const t of tombs) {
    const base = [
      t['墓葬编号'], t['年代'] || '', t['墓向'] || '', t['墓葬形制'] || '',
      t['墓口长'] ?? '', t['墓口宽'] ?? '', t['墓深'] ?? '',
      t['发掘位置'] || '', t['层位'] || '', t['备注'] || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`);

    const arts = t['随葬器物'] || [];
    if (arts.length > 0) {
      for (const a of arts) {
        const artFields = [
          a['器物编号'] || '', a['器物名称'] || '', a['材质'] || '',
          a['器型'] || '', a['数量'] ?? '', a['特征描述'] || ''
        ].map(v => `"${String(v).replace(/"/g, '""')}"`);
        rows.push([...base, ...artFields].join(','));
      }
    } else {
      rows.push([...base, '""', '""', '""', '""', '""', '""'].join(','));
    }
  }

  const csv = '\ufeff' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${parserResult['报告名称'] || 'tombs'}_tombs.csv`);
}

export function exportAsMarkdown(parserResult) {
  const tombs = parserResult['墓葬列表'] || [];
  const name = parserResult['报告名称'] || '墓葬数据';
  const parts = [];

  parts.push(`# 墓葬数据 — ${name}\n`);
  parts.push(`共提取 **${tombs.length}** 条墓葬记录\n`);
  parts.push('## 概览\n');
  parts.push('| 墓葬编号 | 年代 | 形制 | 尺寸(长×宽×深) | 随葬品数 |');
  parts.push('|----------|------|------|----------------|----------|');

  for (const t of tombs) {
    const l = t['墓口长'];
    const w = t['墓口宽'];
    const d = t['墓深'];
    const dim = (l || w) ? `${l || ''}×${w || ''}×${d || ''}m` : '';
    const artCount = (t['随葬器物'] || []).length;
    parts.push(`| ${t['墓葬编号']} | ${t['年代'] || ''} | ${t['墓葬形制'] || ''} | ${dim} | ${artCount} |`);
  }

  parts.push('\n## 详细记录\n');
  for (const t of tombs) {
    parts.push(`### ${t['墓葬编号']}\n`);
    for (const label of ['年代', '墓向', '墓葬形制', '墓口长', '墓口宽', '墓深', '发掘位置', '层位', '备注']) {
      const val = t[label];
      if (val) parts.push(`- **${label}**: ${val}`);
    }
    const arts = t['随葬器物'] || [];
    if (arts.length > 0) {
      parts.push(`\n**随葬器物** (${arts.length}件)\n`);
      parts.push('| 编号 | 名称 | 材质 | 器型 | 数量 | 特征描述 |');
      parts.push('|------|------|------|------|------|----------|');
      for (const a of arts) {
        let desc = a['特征描述'] || '';
        if (desc.length > 80) desc = desc.slice(0, 80) + '...';
        parts.push(`| ${a['器物编号'] || ''} | ${a['器物名称'] || ''} | ${a['材质'] || ''} | ${a['器型'] || ''} | ${a['数量'] ?? ''} | ${desc} |`);
      }
    }
    parts.push('');
  }

  const md = parts.join('\n');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `${name}_tombs.md`);
}
