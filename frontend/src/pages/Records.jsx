import { useEffect, useMemo, useState } from 'react';
import { fetchComplaints, fetchCfiles, fetchMCs, fetchMComs } from '../api';
import '../CMAStyles.css';

function statusToLabel(value) {
  if (!value) return '—';
  return String(value);
}

function getRecordRow({
  id,
  module,
  name,
  category,
  date,
  status,
  created_at,
  updated_at,
  details,
}) {
  return {
    id,
    module,
    name,
    category,
    date,
    status,
    created_at: created_at ?? null,
    updated_at: updated_at ?? null,
    details: details ?? {},
  };
}


function ViewModal({ isOpen, onClose, record }) {
  if (!isOpen || !record) return null;

  const theme = {
    navy: '#1a3a6b',
    card: '#ffffff',
    text: '#1a1a2e',
    text2: '#5a6478',
    text3: '#94a0b4',
    border: '#e2e8f0',
    blue: '#2563eb',
    green: '#16a34a',
    red: '#dc2626',
    orange: '#ea580c',
  };

  const formatDisplay = (v) => {
    if (!v) return '—';
    return String(v);
  };

  const status = formatDisplay(record.status);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: theme.card,
          borderRadius: 14,
          padding: 24,
          maxWidth: 720,
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: `1px solid ${theme.border}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: theme.text, fontWeight: 800 }}>
              {record.module} — Record Details
            </h3>
            <div style={{ marginTop: 6, fontSize: 13, color: theme.text2 }}>
              <span style={{ fontWeight: 700, color: theme.navy }}>{record.name}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: theme.text3 }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'ID', value: record.id },
            { label: 'Module', value: record.module },
            { label: 'Category', value: record.category },
            { label: 'Date', value: record.date },
          ].map((x) => (
            <div key={x.label} style={{ background: '#f8fafc', border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, color: theme.text3, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px' }}>{x.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginTop: 6 }}>{formatDisplay(x.value)}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, padding: 14, background: '#f8fafc', border: `1px solid ${theme.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: theme.text3, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px' }}>Status</div>
          <div style={{ marginTop: 8, display: 'inline-flex', padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: '#eff6ff', color: theme.blue }}>
            {status}
          </div>
        </div>

        {/* Full details block (created_by/created_at/updated_by/updated_at if available) */}
        {record.details && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, color: theme.text3, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>
              Created / Updated
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, color: theme.text3, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px' }}>Created At</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: theme.text, marginTop: 6 }}>{formatDisplay(record.created_at)}</div>
                <div style={{ fontSize: 12, color: theme.text2, marginTop: 4 }}>{formatDisplay(record.details.created_by || '—')}</div>
              </div>

              <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, color: theme.text3, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px' }}>Updated At</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: theme.text, marginTop: 6 }}>{formatDisplay(record.updated_at)}</div>
                <div style={{ fontSize: 12, color: theme.text2, marginTop: 4 }}>{formatDisplay(record.details.updated_by || '—')}</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', borderTop: `1px solid ${theme.border}`, paddingTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              color: theme.text2,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              padding: '10px 16px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Records() {
  const [tab, setTab] = useState('all'); // all | mc | mcom | cf | complaint
  const [query, setQuery] = useState('');

  const [mcRows, setMcRows] = useState([]);
  const [mcomRows, setMcomRows] = useState([]);
  const [cfRows, setCfRows] = useState([]);
  const [complaintRows, setComplaintRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);


  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [mcs, mcoms, cfiles, complaintsResp] = await Promise.all([
          fetchMCs().catch(() => []),
          fetchMComs({}).catch(() => []),
          fetchCfiles().catch(() => []),
          fetchComplaints('', 1, 10000).catch(() => ({ items: [] })),
        ]);

        if (!alive) return;

        const normalizeList = (resp) => {
          if (!resp) return [];
          if (Array.isArray(resp)) return resp;
          // common patterns: { rows: [...] } / { items: [...] } / { data: [...] }
          if (Array.isArray(resp.rows)) return resp.rows;
          if (Array.isArray(resp.items)) return resp.items;
          if (Array.isArray(resp.data)) return resp.data;
          return [];
        };

        const mcList = normalizeList(mcs);
        const mcomList = normalizeList(mcoms);
        const cfList = normalizeList(cfiles);

        // fetchComplaints may return { items } / { data } / array depending on backend.
        const complaints = normalizeList(complaintsResp);

        const mcMapped = (mcList || []).map((r) =>
          getRecordRow({
            id: r.id ?? r.file_no ?? r.fileNo,
            module: 'MC',
            name: r.name ?? r.management_corporation_name ?? r.file_no ?? r.fileNo ?? '—',
            category: r.category ?? r.mcType ?? '—',
            date: r.joined ?? r.renewal_period ?? r.renewal ?? '—',
            status: r.status ?? r.renewal_status ?? r.renewal ?? '—',
            created_at: r.created_at,
            updated_at: r.updated_at,
            details: r,
          })
        );

        const mcomMapped = (mcomList || []).map((r) =>
          getRecordRow({
            id: r.id ?? r.file_no ?? r.fileNo,
            module: 'M.Com',
            name: r.name ?? r.management_corporation_name ?? r.file_no ?? r.fileNo ?? '—',
            category: r.category ?? r.type ?? r.mcType ?? '—',
            date: r.joined ?? r.renewal_period ?? r.renewalPeriod ?? '—',
            status: r.status ?? r.renewal_status ?? '—',
            created_at: r.created_at,
            updated_at: r.updated_at,
            details: r,
          })
        );

        const cfMapped = (cfList || []).map((r) =>
          getRecordRow({
            id: r.id ?? r.file_no ?? r.fileNo,
            module: 'C Files',
            name: r.title ?? r.name ?? r.file_no ?? r.fileNo ?? '—',
            category: r.category ?? '—',
            date: r.dateFiled ?? r.date_filed ?? r.dateFiled_at ?? r.date ?? '—',
            status: r.status ?? r.priority ?? '—',
            created_at: r.created_at,
            updated_at: r.updated_at,
            details: r,
          })
        );

        const complaintMapped = (complaints || []).map((r) =>
          getRecordRow({
            id: r.id ?? r.complaint_no ?? r.ref_no,
            module: 'Complaints',
            name: r.subject ?? r.complaint_no ?? r.ref_no ?? '—',
            category: r.category ?? '—',
            date: r.filed ?? r.filed_date ?? '—',
            status: r.status ?? '—',
            created_at: r.created_at,
            updated_at: r.updated_at,
            details: r,
          })
        );


        if (!alive) return;
        setMcRows(mcMapped);
        setMcomRows(mcomMapped);
        setCfRows(cfMapped);
        setComplaintRows(complaintMapped);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load records');
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    const all = [...mcRows, ...mcomRows, ...cfRows, ...complaintRows];
    if (tab === 'all') return all;
    if (tab === 'mc') return mcRows;
    if (tab === 'mcom') return mcomRows;
    if (tab === 'cf') return cfRows;
    if (tab === 'complaint') return complaintRows;
    return all;
  }, [tab, mcRows, mcomRows, cfRows, complaintRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.id, r.module, r.name, r.category, r.date, r.status]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  const tabs = [
    { id: 'all', label: 'All Records' },
    { id: 'mc', label: 'MC' },
    { id: 'mcom', label: 'M.Com' },
    { id: 'cf', label: 'C Files' },
    { id: 'complaint', label: 'Complaints' },
  ];

  return (
    <div className="cma-page">
      <ViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewRecord(null);
        }}
        record={viewRecord}
      />
      <div className="page-header">
        <div>
          <h2>Records — Database Operations</h2>
          <p style={{ marginTop: 4, color: 'var(--text3)', fontSize: 13 }}>View, edit, delete and manage all records</p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            // simple CSV export of current filtered view
            const cols = ['ID', 'Module', 'Name/Title', 'Category', 'Date', 'Status'];
            const csv = [cols.join(',')]
              .concat(
                filtered.map((r) =>
                  [r.id, r.module, r.name, r.category, r.date, r.status]
                    .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
                    .join(',')
                )
              )
              .join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `records-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        >
          <i className="fas fa-download" /> Export All CSV
        </button>
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        {tabs.map((t) => (
          <div
            key={t.id}
            className={t.id === tab ? 'tab active' : 'tab'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: t.id === tab ? 'var(--navy)' : 'var(--text3)',
              borderBottom: t.id === tab ? '2px solid var(--navy)' : '2px solid transparent',
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Database Records</span>
          <input
            className="form-control"
            style={{ width: 220 }}
            placeholder="Search all..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Module</th>
                <th>Name/Title</th>
                <th>Category</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 18, color: 'var(--text3)' }}>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} style={{ padding: 18, color: 'var(--red)' }}>
                    {error}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 18, color: 'var(--text3)' }}>
                    No records found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={String(r.id)}>
                    <td>
                      <code style={{ fontSize: 11, background: 'var(--bg)', padding: '2px 5px', borderRadius: 4 }}>
                        {r.id}
                      </code>
                    </td>
                    <td>{r.module}</td>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td>{r.category}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                    <td>{statusToLabel(r.status)}</td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setViewRecord(r);
                            setShowViewModal(true);
                          }}
                        >
                          <i className="fas fa-eye" />
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => alert(`Edit: ${r.module} - ${r.name}`)}
                        >
                          <i className="fas fa-edit" />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => alert(`Delete: ${r.module} - ${r.name} (not wired)`)}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

