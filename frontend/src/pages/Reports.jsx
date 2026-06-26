import { useEffect, useState, useMemo, useRef, Fragment } from 'react';
import * as XLSX from 'xlsx';
import '../CMAStyles.css';

// Used by Excel upload in Reports
const apiPostJson = async (url, body) => {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.error || json?.message || `Request failed: ${r.status}`);
  return json;
};


const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
// Server origin (without the trailing /api) — used to resolve file URLs that the
// backend returns as relative paths (e.g. "/uploads/abc123.pdf"). Without this,
// a relative doc.url resolves against the FRONTEND's own origin in the browser,
// not the API server, so print/download silently hit a 404 on the wrong host.
const ORIGIN = API.replace(/\/api\/?$/, '');
const resolveDocUrl = url => {
  if (!url) return url;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

const FIELDS = {
  mc: [
    { key: 'file_no', label: 'File No' }, { key: 'reg_date', label: 'Reg Date' },
    { key: 'name', label: 'MC Name' }, { key: 'address', label: 'Address' },
    { key: 'plan_no', label: 'Plan No' }, { key: 'town', label: 'Town' },
    { key: 'units', label: 'Units' }, { key: 'category', label: 'Category' },
    { key: 'year', label: 'Year' }, { key: 'secretary', label: 'Secretary' },
    { key: 'treasurer', label: 'Treasurer' }, { key: 'engineer', label: 'Engineer' },
    { key: 'agm_date', label: 'AGM Date' }, { key: 'status', label: 'Status' },
  ],
  mcom: [
    { key: 'file_no', label: 'File No' }, { key: 'reg_date', label: 'Reg Date' },
    { key: 'management_corporation_name', label: 'MC Name' }, { key: 'address', label: 'Address' },
    { key: 'plan_no', label: 'Plan No' }, { key: 'town', label: 'Town' },
    { key: 'units', label: 'Units' }, { key: 'category', label: 'Category' },
    { key: 'year', label: 'Year' }, { key: 'secretary', label: 'Secretary' },
    { key: 'treasurer', label: 'Treasurer' }, { key: 'engineer', label: 'Engineer' },
    { key: 'agm_date', label: 'AGM Date' }, { key: 'status', label: 'Status' },
  ],
  cf: [
    { key: 'file_no', label: 'File No' }, { key: 'name_of_apartment', label: 'Apartment' },
    { key: 'address', label: 'Address' }, { key: 'date', label: 'Date' },
    { key: 'category', label: 'Category' }, { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status' },
  ],
  complaints: [
    { key: 'complaint_no', label: 'No' }, { key: 'complaint_date', label: 'Date' },
    { key: 'complainant_name', label: 'Complainant' }, { key: 'subject', label: 'Subject' },
    { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' },
    { key: 'days_pending', label: 'Days' }, { key: 'assigned_to_dgm', label: 'DGM' },
  ],
};

const CARDS = [
  { type: 'mc', icon: 'fa-building', color: '#2563eb', bg: '#eff6ff', title: 'MC', sub: 'Management Corps' },
  { type: 'mcom', icon: 'fa-city', color: '#0d9488', bg: '#f0fdfa', title: 'M.Com', sub: 'Committee Records' },
  { type: 'cf', icon: 'fa-folder-open', color: '#d97706', bg: '#fffbeb', title: 'C Files', sub: 'File Registry' },
  { type: 'complaints', icon: 'fa-comment-exclamation', color: '#dc2626', bg: '#fef2f2', title: 'Complaints', sub: 'Complaints Register' },
  { type: 'full', icon: 'fa-layer-group', color: '#7c3aed', bg: '#f5f3ff', title: 'Summary', sub: 'All Modules' },
];

const DATE_KEYS = ['reg_date', 'date', 'agm_date', 'next_agm_date', 'complaint_date', 'resolution_date'];
const WRAP_KEYS = ['address', 'reason', 'description', 'remarks'];

const fmtDate = v => { const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v); };
const fv = (row, key) => {
  if (!row) return '—';
  let val = row[key];
  if (key === 'name' && val == null) val = row.management_corporation_name;
  if (DATE_KEYS.includes(key) && val) return fmtDate(val);
  return val == null || String(val).trim() === '' ? '—' : String(val);
};
const statusColor = v => {
  if (!v || v === '—') return 'var(--text3)';
  const s = v.toLowerCase();
  if (s === 'active' || s === 'open' || s === 'new') return '#16a34a';
  if (s.includes('non active') || s === 'closed' || s === 'close') return '#dc2626';
  if (s === 'pending' || s.includes('review')) return '#d97706';
  return '#2563eb';
};
const apiFetch = async url => { const r = await fetch(url).catch(() => null); return r?.ok ? r.json().catch(() => null) : null; };
const cnt = (arr, ...ss) => arr.filter(r => ss.includes(r.status)).length;

// ── Print helpers ─────────────────────────────────────────────────────────
function printTable(title, sub, rows, fields) {
  if (!rows.length) return;
  const w = window.open('', '_blank'); if (!w) return;

  const escapeHtml = (s) => String(s ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');

  const css = `
    @page{size:landscape;margin:10mm}
    html,body{font-family:sans-serif;font-size:10px;color:#1a1a2e;margin:0}
    .hdr{background:#1a3a6b;color:#fff;padding:12px 16px;border-radius:8px;margin-bottom:12px}
    .hdr h2{margin:0;font-size:15px}.hdr p{margin:3px 0 0;font-size:10px;opacity:.7}
    table{width:100%;border-collapse:collapse;table-layout:auto}
    th{background:#edf2f7;padding:6px 8px;text-align:left;border:1px solid #cbd5e0;font-size:9px;text-transform:uppercase;font-weight:700;white-space:nowrap}
    td{padding:6px 8px;border:1px solid #cbd5e0;vertical-align:top;word-break:break-word;white-space:normal}
    tr:nth-child(even) td{background:#f7fafc}
    .nowrap{white-space:nowrap}
  `;

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${css}</style></head><body>
    <div class="hdr"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(sub || '')} &bull; ${rows.length} records &bull; ${new Date().toLocaleDateString('en-LK')}</p></div>
    <table>
      <thead><tr><th>#</th>${fields.map(f => `<th>${escapeHtml(f.label)}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.map((r, i) => {
          const tds = fields.map(f => {
            const val = fv(r, f.key);
            const cls = WRAP_KEYS.includes(f.key) ? '' : 'nowrap';
            return `<td class="${cls}">${escapeHtml(val)}</td>`;
          }).join('');
          return `<tr><td>${i + 1}</td>${tds}</tr>`;
        }).join('')}
      </tbody>
    </table>
    <script>setTimeout(()=>window.print(), 200);</script>
  </body></html>`);

  w.document.close();
}

// ── DataTable ─────────────────────────────────────────────────────────────
function DataTable({ rows, fields }) {
  const [search, setSearch] = useState('');
  const [sfStatus, setSfStatus] = useState('');
  const [sfYear, setSfYear] = useState('');
  const [expanded, setExpanded] = useState({});

  const uStatuses = useMemo(() => [...new Set(rows.map(r => r.status).filter(Boolean))].sort(), [rows]);
  const uYears = useMemo(() => [...new Set(rows.map(r => r.year).filter(Boolean))].sort((a, b) => b - a), [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (sfStatus && r.status !== sfStatus) return false;
    if (sfYear && String(r.year) !== sfYear) return false;
    if (search) { const q = search.toLowerCase(); return fields.some(f => fv(r, f.key).toLowerCase().includes(q)); }
    return true;
  }), [rows, sfStatus, sfYear, search, fields]);

  const exportXlsx = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => Object.fromEntries(fields.map(f => [f.label, fv(r, f.key)]))));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 160px', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }} />
        {uStatuses.length > 0 &&
          <select value={sfStatus} onChange={e => setSfStatus(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
            <option value="">All Status</option>
            {uStatuses.map(s => <option key={s}>{s}</option>)}
          </select>}
        {uYears.length > 0 &&
          <select value={sfYear} onChange={e => setSfYear(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
            <option value="">All Years</option>
            {uYears.map(y => <option key={y}>{y}</option>)}
          </select>}
        <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>{filtered.length} records</span>
        <button className="btn btn-outline btn-sm" onClick={() => printTable('Report', '', filtered, fields)}><i className="fas fa-print" /> Print</button>
        <button className="btn btn-outline btn-sm" onClick={exportXlsx}><i className="fas fa-file-excel" /> Excel</button>
      </div>

      {/* Table */}
      {filtered.length === 0
        ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 8 }}>No records.</div>
        : <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 440, border: '1px solid var(--border)', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, width: 28, background: '#f8fafc', padding: '8px', borderBottom: '2px solid var(--border)' }} />
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc', padding: '8px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>#</th>
                {fields.map(f => (
                  <th key={f.key} style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc', padding: '8px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const rid = row.id ?? idx;
                return (
                  <Fragment key={rid}>
                    <tr onClick={() => setExpanded(p => ({ ...p, [rid]: !p[rid] }))} style={{ cursor: 'pointer' }}>
                      <td style={{ textAlign: 'center', color: 'var(--text3)', padding: 8 }}>
                        <i className={`fas fa-chevron-${expanded[rid] ? 'up' : 'down'}`} style={{ fontSize: 10 }} />
                      </td>
                      <td style={{ padding: 8, color: 'var(--text3)' }}>{idx + 1}</td>
                      {fields.map(f => (
                        <td key={f.key} style={{
                          padding: 8, borderBottom: '1px solid var(--border)',
                          fontWeight: f.key === 'status' ? 700 : 400,
                          color: f.key === 'status' ? statusColor(fv(row, f.key)) : undefined,
                          whiteSpace: WRAP_KEYS.includes(f.key) ? 'normal' : 'nowrap',
                          maxWidth: WRAP_KEYS.includes(f.key) ? 200 : undefined
                        }}>
                          {fv(row, f.key)}
                        </td>
                      ))}
                    </tr>
                    {expanded[rid] && (
                      <tr><td colSpan={fields.length + 2} style={{ padding: 0 }}>
                        <div style={{ background: '#f8fafc', borderTop: '1px solid var(--border)', padding: '14px 16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
                            {fields.map(f => (
                              <div key={f.key} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px' }}>
                                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text3)', fontWeight: 700, marginBottom: 2 }}>{f.label}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: f.key === 'status' ? statusColor(fv(row, f.key)) : 'var(--text)' }}>{fv(row, f.key)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td></tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
}

// ── FullSummary ───────────────────────────────────────────────────────────
function FullSummary({ fullData, fullStats, loading }) {
  const [tab, setTab] = useState('overview');

  const modList = [
    { key: 'mc', label: 'MC', color: '#2563eb', icon: 'fa-building' },
    { key: 'mcom', label: 'M.Com', color: '#0d9488', icon: 'fa-city' },
    { key: 'cf', label: 'C Files', color: '#d97706', icon: 'fa-folder-open' },
    { key: 'complaints', label: 'Complaints', color: '#dc2626', icon: 'fa-comment-exclamation' },
  ];
  const statMap = { mc: fullStats.mc, mcom: fullStats.mcom, cf: fullStats.cf, complaints: fullStats.comp };

  const printAll = () => {
    const w = window.open('', '_blank'); if (!w) return;
    let body = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Full Report</title><style>
      @page{size:landscape;margin:10mm}body{font-family:sans-serif;font-size:10px;color:#1a1a2e;margin:0}
      .hdr{background:#7c3aed;color:#fff;padding:12px 16px;border-radius:8px;margin-bottom:12px}
      .hdr h2{margin:0;font-size:16px}.hdr p{margin:3px 0 0;font-size:10px;opacity:.75}
      .sec{margin-bottom:20px;page-break-inside:avoid}
      .stitle{font-size:12px;font-weight:800;color:#fff;padding:5px 10px;border-radius:5px;margin-bottom:6px;display:inline-block}
      table{width:100%;border-collapse:collapse;margin-bottom:4px}
      th{background:#edf2f7;padding:5px 7px;text-align:left;border:1px solid #cbd5e0;font-size:8px;text-transform:uppercase;font-weight:700;white-space:nowrap}
      td{padding:5px 7px;border:1px solid #cbd5e0;font-size:9px}tr:nth-child(even) td{background:#f7fafc}
      .grand{background:#1a3a6b;color:#fff;font-weight:800;padding:8px 14px;border-radius:6px;margin-top:8px;font-size:12px}
    </style></head><body>
    <div class="hdr"><h2>CMA — Full System Report</h2>
    <p>All Modules &bull; ${new Date().toLocaleString('en-LK')}</p></div>`;

    const defs = [
      { key: 'mc', label: 'MC Management', color: '#2563eb' },
      { key: 'mcom', label: 'M.Com Records', color: '#0d9488' },
      { key: 'cf', label: 'C Files', color: '#d97706' },
      { key: 'complaints', label: 'Complaints', color: '#dc2626' },
    ];
    let grand = 0;
    for (const d of defs) {
      const rows = fullData[d.key] ?? [];
      const fields = FIELDS[d.key] ?? [];
      grand += rows.length;
      body += `<div class="sec">
        <div class="stitle" style="background:${d.color}">${d.label} — ${rows.length} records</div>
        <table><thead><tr><th>#</th>${fields.map(f => `<th>${f.label}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td>${fields.map(f => `<td>${fv(r, f.key)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>`;
    }
    body += `<div class="grand">GRAND TOTAL: ${grand} records</div></body></html>`;
    w.document.write(body); w.document.close(); setTimeout(() => w.print(), 500);
  };

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 20, display: 'block', marginBottom: 8 }} /> Loading…</div>;

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <button onClick={() => setTab('overview')} className="btn btn-sm"
          style={{ fontWeight: 600, border: tab === 'overview' ? '2px solid #7c3aed' : '1px solid var(--border)', background: tab === 'overview' ? '#f5f3ff' : 'var(--card)', color: tab === 'overview' ? '#7c3aed' : 'var(--text2)' }}>
          <i className="fas fa-layer-group" style={{ marginRight: 5 }} />Overview
        </button>
        {modList.map(m => (
          <button key={m.key} onClick={() => setTab(m.key)} className="btn btn-sm"
            style={{ fontWeight: 600, border: tab === m.key ? `2px solid ${m.color}` : '1px solid var(--border)', background: tab === m.key ? m.color + '15' : 'var(--card)', color: tab === m.key ? m.color : 'var(--text2)' }}>
            <i className={`fas ${m.icon}`} style={{ marginRight: 5 }} />{m.label}
          </button>
        ))}
        <button onClick={printAll} className="btn btn-sm" style={{ marginLeft: 'auto', border: '1px solid #7c3aed', color: '#7c3aed', background: '#f5f3ff' }}>
          <i className="fas fa-print" style={{ marginRight: 5 }} />Print All
        </button>
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 14 }}>
            {[
              { label: 'MC', col: '#2563eb', bg: '#eff6ff', icon: 'fa-building', s: fullStats.mc },
              { label: 'M.Com', col: '#0d9488', bg: '#f0fdfa', icon: 'fa-city', s: fullStats.mcom },
              { label: 'C Files', col: '#d97706', bg: '#fffbeb', icon: 'fa-folder-open', s: fullStats.cf },
              { label: 'Complaints', col: '#dc2626', bg: '#fef2f2', icon: 'fa-comment-exclamation', s: fullStats.comp },
            ].map((x, i) => (
              <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>{x.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: x.col }}>{x.s.total}</div>
                  </div>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: x.bg, color: x.col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    <i className={`fas ${x.icon}`} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>Active {x.s.active}</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#fef9c3', color: '#854d0e', fontWeight: 600 }}>Pending {x.s.pending}</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>Closed {x.s.closed}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary table */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Breakdown</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>{['Module', 'Total', 'Active', 'Pending', 'Closed', 'Actions'].map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '2px solid var(--border)', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: 'var(--text3)', textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {[['MC Management', 'mc'], ['M.Com', 'mcom'], ['C Files', 'cf'], ['Complaints', 'complaints']].map(([name, key], i) => {
                  const s = statMap[key];
                  return (
                    <tr key={i}>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{name}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 700, color: 'var(--navy)' }}>{s.total}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{s.active}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 600, color: '#d97706' }}>{s.pending}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>{s.closed}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => printTable(name, '', fullData[key], FIELDS[key])}><i className="fas fa-print" /></button>
                          <button className="btn btn-outline btn-sm" onClick={() => setTab(key)}><i className="fas fa-table" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: 'var(--bg)', fontWeight: 800 }}>
                  <td style={{ padding: '9px 12px' }}>TOTAL</td>
                  {['total', 'active', 'pending', 'closed'].map((k, j) => (
                    <td key={j} style={{ padding: '9px 12px', textAlign: 'right', fontSize: 14 }}>
                      {['mc', 'mcom', 'cf', 'comp'].reduce((s, m) => s + fullStats[m][k], 0)}
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Module detail tabs */}
      {tab !== 'overview' && (
        <DataTable rows={fullData[tab] ?? []} fields={FIELDS[tab] ?? []} />
      )}
    </div>
  );
}

// ── DocumentCard ──────────────────────────────────────────────────────────
function DocumentCard({ doc, onRemove }) {
  const ext = doc.name.split('.').pop().toLowerCase();
  const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';

  const iconInfo = isPdf
    ? { icon: 'fa-file-pdf', color: '#dc2626', bg: '#fef2f2' }
    : isImg
    ? { icon: 'fa-file-image', color: '#7c3aed', bg: '#f5f3ff' }
    : ['xlsx', 'xls', 'csv'].includes(ext)
    ? { icon: 'fa-file-excel', color: '#16a34a', bg: '#dcfce7' }
    : ['doc', 'docx'].includes(ext)
    ? { icon: 'fa-file-word', color: '#2563eb', bg: '#eff6ff' }
    : { icon: 'fa-file-alt', color: '#d97706', bg: '#fffbeb' };

  const fmtSize = b => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  // Resolve relative paths against the API server's origin, then cache-bust using
  // the doc's id/uploadedAt/updatedAt so the browser never serves a stale cached
  // response for a re-used filename/path after a fresh upload.
  const resolvedUrl = resolveDocUrl(doc.url);
  const cacheKey = doc.updatedAt ?? doc.uploadedAt ?? doc.id ?? Date.now();
  const freshUrl = resolvedUrl.includes('?')
    ? `${resolvedUrl}&v=${encodeURIComponent(cacheKey)}`
    : `${resolvedUrl}?v=${encodeURIComponent(cacheKey)}`;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = freshUrl;
    a.download = doc.name;
    a.click();
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;

    if (isImg) {
      // Images render directly — print the real picture
      w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.name}</title>
        <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0}
        img{max-width:100%;max-height:100vh;object-fit:contain;box-shadow:0 4px 24px rgba(0,0,0,.2)}</style></head>
        <body><img src="${freshUrl}" onload="window.print()" /></body></html>`);
      w.document.close();
    } else if (isPdf) {
      // Print real PDF (reliably) by printing the iframe window.
      // Use a print trigger after load + small delay.
      w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.name}</title>
        <style>
          html,body{margin:0;height:100%}
          iframe{width:100%;height:100%;border:none}
          @media print{ body{margin:0} }
        </style></head>
        <body>
          <iframe id="pdfFrame" src="${freshUrl}"></iframe>
          <script>
            const f = document.getElementById('pdfFrame');
            f.onload = () => {
              setTimeout(() => {
                try { f.contentWindow.focus(); } catch(e){}
                try { f.contentWindow.print(); } catch(e){}
                try { window.print(); } catch(e){}
              }, 300);
            };
            // Fallback if onload doesn't fire
            setTimeout(() => {
              try { window.print(); } catch(e){}
            }, 1200);
          <\/script>
        </body></html>`);
      w.document.close();
    } else {
      // Word/Excel/CSV and other binary formats can't be rendered inline by the browser —
      // tell the user honestly instead of pretending to print real content
      w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.name}</title>
        <style>body{font-family:sans-serif;font-size:12px;padding:20px;color:#1a1a2e}
        .hdr{background:#1a3a6b;color:#fff;padding:12px 16px;border-radius:8px;margin-bottom:16px}
        .hdr h2{margin:0;font-size:15px}.hdr p{margin:3px 0 0;font-size:10px;opacity:.7}
        .note{padding:32px;text-align:center;border:2px dashed #cbd5e0;border-radius:8px;color:#64748b}
        </style></head><body>
        <div class="hdr"><h2>${doc.name}</h2><p>Uploaded ${doc.uploadedAt} &bull; ${fmtSize(doc.size)}</p></div>
        <div class="note">This file type can't be previewed in the browser, so it can't be printed from here.<br/><br/>
        Use <strong>Download</strong>, then open and print it from its native app (Word, Excel, etc).</div></body></html>`);
      w.document.close();
    }
  };

  return (
    <div style={{
      background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 10,
      padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: 'var(--shadow)', position: 'relative'
    }}>
      {/* Remove button */}
      <button onClick={() => onRemove(doc.id)}
        style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, lineHeight: 1 }}
        title="Remove">
        <i className="fas fa-times" style={{ fontSize: 11 }} />
      </button>

      {/* Icon + name */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, background: iconInfo.bg, color: iconInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
          <i className={`fas ${iconInfo.icon}`} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.name}>{doc.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{fmtSize(doc.size)}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{doc.uploadedAt}</div>
        </div>
      </div>

      {/* Preview thumbnail for images */}
      {isImg && (
        <div style={{ borderRadius: 6, overflow: 'hidden', maxHeight: 90, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
          <img src={resolvedUrl} alt={doc.name} style={{ maxWidth: '100%', maxHeight: 90, objectFit: 'contain' }} />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-outline btn-sm" onClick={handlePrint} style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fas fa-print" style={{ fontSize: 11 }} /> Print
        </button>
        <button className="btn btn-outline btn-sm" onClick={handleDownload} style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 4, color: '#2563eb', borderColor: '#2563eb' }}>
          <i className="fas fa-download" style={{ fontSize: 11 }} /> Download
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function Reports() {
  const [stats, setStats] = useState({ mc: 0, mcom: 0, cfiles: 0, pendingComplaints: 0 });
  const [active, setActive] = useState(null);
  const [rows, setRows] = useState([]);
  const [fullData, setFullData] = useState({ mc: [], mcom: [], cf: [], complaints: [] });
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const docInputRef = useRef(null);

  useEffect(() => {
    apiFetch(`${API}/dashboard/stats`).then(s => s && setStats(s));
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDocuments = async () => {
    // cache: 'no-store' ensures we always get the freshly uploaded/removed list,
    // not a stale browser-cached response for this same URL
    const r = await fetch(`${API}/reports/documents`, { cache: 'no-store' }).catch(() => null);
    const docs = r?.ok ? await r.json().catch(() => null) : null;
    setDocuments(docs ?? []);
  };

const handleDocUpload = async e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const form = new FormData();
    for (const f of files) form.append('files', f);

    try {
      // Upload docs first. (The UI already supports PDF upload & list/print/download)
      await fetch(`${API}/reports/documents`, {
        method: 'POST',
        body: form,
      }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || j?.message || `Upload failed: ${r.status}`);
        return j;
      });

      // Always resync from backend so the UI reflects the latest DB state.
      await loadDocuments();
    } finally {
      e.target.value = '';
    }
  };

  const handleDocRemove = async id => {
    await fetch(`${API}/reports/documents/${id}`, { method: 'DELETE' }).then(async r => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || j?.message || `Delete failed: ${r.status}`);
    });
    await loadDocuments();
  };




  const loadReport = async type => {
    if (active === type) { setActive(null); return; }
    setActive(type); setRows([]);
    setFullData({ mc: [], mcom: [], cf: [], complaints: [] });
    setLoading(true);
    try {
      if (type === 'full') {
        const [mc, mcom, cf, comp] = await Promise.all([
          apiFetch(`${API}/mc?limit=10000`), apiFetch(`${API}/mcom?limit=10000`),
          apiFetch(`${API}/cfiles?limit=10000`), apiFetch(`${API}/complaints?limit=10000`),
        ]);
        setFullData({ mc: mc?.rows ?? [], mcom: mcom?.rows ?? [], cf: cf?.rows ?? [], complaints: comp?.complaints ?? [] });
      } else {
        const ep = { mc: `${API}/mc`, mcom: `${API}/mcom`, cf: `${API}/cfiles`, complaints: `${API}/complaints` }[type];
        const d = await apiFetch(`${ep}?limit=10000`);
        setRows(type === 'complaints' ? d?.complaints ?? [] : d?.rows ?? []);
      }
    } finally { setLoading(false); }
  };

  const fullStats = useMemo(() => ({
    mc: { total: fullData.mc.length, active: cnt(fullData.mc, 'Active'), pending: cnt(fullData.mc, 'Pending'), closed: cnt(fullData.mc, 'Non Active') },
    mcom: { total: fullData.mcom.length, active: cnt(fullData.mcom, 'Active', 'Open', 'New'), pending: cnt(fullData.mcom, 'Pending'), closed: cnt(fullData.mcom, 'Close', 'Closed') },
    cf: { total: fullData.cf.length, active: cnt(fullData.cf, 'Open', 'New'), pending: cnt(fullData.cf, 'Pending'), closed: cnt(fullData.cf, 'Closed') },
    comp: { total: fullData.complaints.length, active: cnt(fullData.complaints, 'Pending'), pending: cnt(fullData.complaints, 'DGM Review', 'Legal Review'), closed: cnt(fullData.complaints, 'Closed') },
  }), [fullData]);

  const cardStat = {
    mc: stats.mc, mcom: stats.mcom, cf: stats.cfiles,
    complaints: stats.pendingComplaints ?? 0,
    full: (stats.mc ?? 0) + (stats.mcom ?? 0) + (stats.cfiles ?? 0) + (stats.pendingComplaints ?? 0),
  };

  return (
    <div className="cma-page">
      <style>{`
        .rp-wrap { display: grid; grid-template-columns: repeat(5,1fr); gap: 10px; align-items: start; }
        @media(max-width:900px)  { .rp-wrap { grid-template-columns: repeat(3,1fr); } }
        @media(max-width:540px)  { .rp-wrap { grid-template-columns: repeat(2,1fr); } }
        .rp-card {
          background: var(--card);
          border: 1.5px solid var(--border);
          border-radius: 10px;
          cursor: pointer;
          transition: .15s;
          box-shadow: var(--shadow);
          padding: 14px 10px;
          text-align: center;
          user-select: none;
        }
        .rp-card:hover:not(.rp-active) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,.09); }
        .rp-card.rp-active { border-color: var(--navy); box-shadow: 0 4px 12px rgba(26,58,107,.15); }
        .rp-panel {
          grid-column: 1 / -1;
          border: 1.5px solid var(--border);
          border-radius: 10px;
          background: var(--card);
          overflow: hidden;
        }
        .rp-panel-hdr {
          padding: 10px 14px;
          background: #f8fafc;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
      `}</style>

      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Reports</h2>
        <p style={{ marginTop: 3, fontSize: 12, color: 'var(--text3)', margin: 0 }}>Generate and export reports</p>
      </div>

      <div className="rp-wrap">
        {/* Cards — always visible, fixed position */}
        {CARDS.map(c => (
          <div key={c.type} className={`rp-card${active === c.type ? ' rp-active' : ''}`} onClick={() => loadReport(c.type)}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, margin: '0 auto 8px' }}>
              <i className={`fas ${c.icon}`} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>{cardStat[c.type]}</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{c.title}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.sub}</div>
          </div>
        ))}

        {/* Panel — below cards, full width */}
        {active && (
          <div className="rp-panel">
            <div className="rp-panel-hdr">
              <i className={`fas ${CARDS.find(c => c.type === active)?.icon}`} style={{ color: CARDS.find(c => c.type === active)?.color }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)', flex: 1 }}>{CARDS.find(c => c.type === active)?.title}</span>
              <button className="btn btn-outline btn-sm" onClick={() => setActive(null)}><i className="fas fa-times" /></button>
            </div>
            <div style={{ padding: 14 }}>
              {loading
                ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 20, display: 'block', marginBottom: 8 }} /> Loading…</div>
                : active === 'full'
                  ? <FullSummary fullData={fullData} fullStats={fullStats} loading={loading} />
                  : <DataTable rows={rows} fields={FIELDS[active] ?? []} />
              }
            </div>
          </div>
        )}
      </div>

      {/* ── Documents Section ── */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              <i className="fas fa-file-upload" style={{ marginRight: 7, color: '#2563eb' }} />Documents
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '3px 0 0' }}>
              Upload, preview, print and download document files
            </p>
          </div>
          <button className="btn btn-sm" onClick={() => docInputRef.current?.click()}
            style={{ background: '#2563eb', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <i className="fas fa-plus" style={{ fontSize: 11 }} /> Add Documents
          </button>
          <input ref={docInputRef} type="file" multiple accept="*/*" style={{ display: 'none' }} onChange={handleDocUpload} />
        </div>

        {documents.length === 0 ? (
          <div
            onClick={() => docInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border)', borderRadius: 10, padding: '32px 20px',
              textAlign: 'center', color: 'var(--text3)', cursor: 'pointer', background: 'var(--card)',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <i className="fas fa-cloud-upload-alt" style={{ fontSize: 28, display: 'block', marginBottom: 8, color: '#93c5fd' }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>Click to upload documents</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>PDF, Word, Excel, Images and more</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {documents.map(doc => (
              <DocumentCard key={doc.id} doc={doc} onRemove={handleDocRemove} />
            ))}
            <div
              onClick={() => docInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border)', borderRadius: 10, padding: '20px 12px',
                textAlign: 'center', color: 'var(--text3)', cursor: 'pointer', background: 'var(--card)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                minHeight: 120,
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <i className="fas fa-plus-circle" style={{ fontSize: 22, color: '#93c5fd' }} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>Add More</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}