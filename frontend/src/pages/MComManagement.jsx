import { useEffect, useMemo, useState } from 'react';
import {
  fetchMComs,
  importMComsBulk,
  deleteMComsBulk,
} from '../api';
import { useConfirmDialog } from '../ConfirmDialogContext.jsx';
import '../CMAStyles.css';
import * as XLSX from 'xlsx';
import HistoryModal from '../components/HistoryModal.jsx';

// NOTE: This page is intentionally aligned with MCManagement UI/UX.
// It uses M.Com backend endpoints: /api/mcom and /api/mcom/bulk.

const theme = {
  navy: '#1a3a6b',
  bg: '#f4f6fb',
  card: '#ffffff',
  text: '#1a1a2e',
  text2: '#5a6478',
  text3: '#94a0b4',
  border: '#e2e8f0',
  green: '#16a34a',
  red: '#dc2626',
  blue: '#2563eb',
};

const btnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
  fontFamily: 'inherit',
  transition: '.2s',
};

const btnPrimary = { ...btnBase, background: theme.navy, color: '#fff' };
const btnOutline = { ...btnBase, background: 'transparent', color: theme.text2, border: `1px solid ${theme.border}` };

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.5)',
  zIndex: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

const modalStyle = {
  background: '#fff',
  borderRadius: 16,
  width: '100%',
  maxWidth: 980,
  boxShadow: '0 20px 60px rgba(0,0,0,.2)',
  maxHeight: '90vh',
  overflowY: 'auto',
};

const modalHeader = {
  padding: '18px 22px 14px',
  borderBottom: `1px solid ${theme.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 18,
  color: theme.text3,
  padding: 2,
  lineHeight: 1,
};

const inputStyle = {
  padding: '8px 11px',
  border: `1px solid ${theme.border}`,
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  color: theme.text,
  background: theme.card,
  width: '100%',
  boxSizing: 'border-box',
};

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: theme.navy,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  gridColumn: 'span 2',
  borderBottom: `1px solid ${theme.border}`,
  paddingBottom: 6,
  marginTop: 8,
};

// Compact cell style — fixed width columns with truncation
const cellStyle = {
  padding: '7px 8px',
  fontSize: 12,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 0,
};

const thStyle = {
  textAlign: 'left',
  padding: '7px 8px',
  fontSize: 10,
  fontWeight: 600,
  color: theme.text3,
  textTransform: 'uppercase',
  letterSpacing: '.6px',
  background: '#f8fafc',
  borderBottom: `1px solid ${theme.border}`,
  whiteSpace: 'nowrap',
};

// Column widths (px) — must sum to a reasonable table width
const COL_WIDTHS = {
  'REG DATE': 88,
  'OLD FILE NO': 90,
  'NEW FILE NO': 90,
  'MANAGEMENT CORPORATION': 180,
  'PLAN NO': 72,
  'UNITS': 52,
  'SECRETARY': 110,
  'TOWN': 80,
  'STATUS': 84,
  'ACTIONS': 72,
};

function StatusPill({ status }) {
  const s = String(status || '').toLowerCase();
  const isOpen = s.includes('open');
  const isPending = s.includes('pending');
  const isClose = s.includes('close');
  const isNew = s.includes('new');
  const bg = isOpen
    ? '#eff6ff'
    : isPending
      ? '#fff7ed'
      : isClose
        ? '#fef2f2'
        : isNew
          ? '#f0fdf4'
          : '#eff6ff';
  const color = isOpen
    ? theme.blue
    : isPending
      ? '#b45309'
      : isClose
        ? theme.red
        : isNew
          ? theme.green
          : theme.blue;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        borderRadius: 999,
        background: bg,
        color,
        fontWeight: 700,
        fontSize: 11,
      }}
    >
      {status || '—'}
    </span>
  );
}

function ActionBtn({ icon, color, title, onClick }) {
  return (
    <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: '2px 3px', fontSize: 13 }}>
      <i className={icon} />
    </button>
  );
}

function FormField({ label, value, onChange, type = 'text', span2 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: span2 ? 'span 2' : undefined }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>{label}</label>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>{label}</label>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={sectionLabelStyle}>{children}</div>;
}

function ViewField({ label, value }) {
  return (
    <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 400, color: theme.text }}>{value ?? '—'}</div>
    </div>
  );
}

function normalizeKey(k) {
  return String(k || '')
    .trim()
    .replace(/[_.\-\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeHeaderName(value) {
  return normalizeKey(value);
}

function findHeaderRow(table) {
  if (!Array.isArray(table)) return -1;
  const expected = ['reg date', 'management corporation name', 'new file no', 'old file no'];
  for (let i = 0; i < Math.min(table.length, 6); i += 1) {
    const row = table[i] || [];
    const normalized = row.map(normalizeHeaderName);
    const matches = expected.filter((key) => normalized.includes(key));
    if (matches.length >= 2) return i;
  }
  return -1;
}

function parseSheetRows(ws) {
  const table = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  const headerIndex = findHeaderRow(table);
  if (headerIndex < 0) return [];
  const headers = (table[headerIndex] || []).map((h, idx) => normalizeHeaderName(h) || `col${idx}`);
  return table.slice(headerIndex + 1).map((row) => {
    const record = {};
    for (let col = 0; col < headers.length; col += 1) {
      record[headers[col]] = row[col] ?? '';
    }
    return record;
  });
}

function getCell(row, ...keys) {
  const rk = Object.keys(row || {});
  const map = new Map(rk.map((k) => [normalizeKey(k), k]));
  for (const key of keys) {
    const found = map.get(normalizeKey(key));
    if (found) return row[found];
  }
  return '';
}

function toText(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function toIntOrNull(v) {
  const s = toText(v);
  if (!s) return null;
  const n = Number(String(s).replace(/,/g, ''));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function deriveYear(v) {
  const s = toText(v);
  if (!s) return null;
  const m = s.match(/(19|20)\d{2}/);
  if (m) return Number(m[0]);
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function coerceDateText(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  const text = String(v).trim();
  const numeric = Number(text);
  if (!Number.isNaN(numeric) && numeric > 1000 && numeric < 100000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(numeric));
    return epoch.toISOString().slice(0, 10);
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return text;
}

function deriveStatus(v) {
  const s = toText(v).toLowerCase();
  if (!s) return 'New';
  if (s.includes('open')) return 'Open';
  if (s.includes('pending')) return 'Pending';
  if (s.includes('close')) return 'Close';
  if (s.includes('new')) return 'New';
  return toText(v);
}

function blankForm() {
  return {
    // requested fields
    reg_date: '',
    old_file_no: '',
    remark: '',
    new_file_no: '',
    management_corporation_name: '',
    address: '',
    units: '',
    plan_no: '',
    secretary: '',
    secretary_unit_no: '',
    treasurer: '',
    treasurer_unit_no: '',
    renewal_period: '',
    agm_date: '',
    agm_minutes: '',
    attendance: '',
    audited_account: '',
    building_insurance: '',
    renewal_status: '',
    agm_status: '',
    mc_mcom: '',
    engineer: '',
    management_assistant: '',
    town: '',
    council: '',
    certificate_file_no: '',
    email_address: '',
    awareness_date: '',

    category: '',
    year: '',
    status: 'New',
  };
}

const BACKEND_FIELDS = [
  'reg_date',
  'old_file_no',
  'remark',
  'new_file_no',
  'management_corporation_name',
  'address',
  'units',
  'plan_no',
  'secretary',
  'secretary_unit_no',
  'treasurer',
  'treasurer_unit_no',
  'renewal_period',
  'agm_date',
  'agm_minutes',
  'attendance',
  'audited_account',
  'building_insurance',
  'renewal_status',
  'agm_status',
  'mc_mcom',
  'engineer',
  'management_assistant',
  'town',
  'council',
  'certificate_file_no',
  'email_address',
  'awareness_date',
  // filtering
  'category',
  'year',
  'status',
];

function toBackendRecordFromExcelRow(row) {
  const rawFile = toText(getCell(row,
    'file_no', 'File No', 'File Number', 'file number', 'FILE_NO', 'FILE NUMBER'));
  const newFile = toText(getCell(row,
    'New File No.', 'New File No', 'New_File_No', 'new_file_no', 'New File Number', 'new file number'));
  const oldFile = toText(getCell(row,
    'Old File No.', 'Old File No', 'Old_File_No', 'old_file_no', 'Old File Number', 'old file number'));

  const file_no = rawFile || newFile || oldFile;

  const reg_date = coerceDateText(getCell(row, 'reg_date', 'Reg_Date', 'Reg. Date', 'REG_DATE'));
  const year = deriveYear(reg_date);

  const rec = {
    file_no,
    reg_date: reg_date || null,
    old_file_no: oldFile || null,
    remark: toText(getCell(row, 'remark', 'Remark')) || null,
    new_file_no: newFile || null,
    management_corporation_name:
      toText(getCell(row, 'management_corporation_name', 'Management Corporation Name', 'Name of Management Corporation - New', 'management_corporation_name')) || null,
    address: toText(getCell(row, 'address', 'Address')) || null,
    units: toText(getCell(row, 'units', 'Units')) || null,
    plan_no: toText(getCell(row, 'plan_no', 'Plan No', 'Plan No.')) || null,

    secretary: toText(getCell(row, 'secretary', 'Secretary')) || null,
    secretary_unit_no: toText(getCell(row, 'secretary_unit_no', 'Secretary unit No.', 'Secretary Unit No.')) || null,

    treasurer: toText(getCell(row, 'treasurer', 'Treasurer')) || null,
    treasurer_unit_no: toText(getCell(row, 'treasurer_unit_no', 'Treasurer unit No.', 'Treasurer Unit No.')) || null,

    renewal_period: toText(getCell(row, 'renewal_period', 'Renewal Period')) || null,
    agm_date: coerceDateText(getCell(row, 'agm_date', 'AGM Date')) || null,
    agm_minutes: toText(getCell(row, 'agm_minutes', 'AGM Minutes')) || null,
    attendance: toText(getCell(row, 'attendance', 'Attendance')) || null,

    audited_account: toText(getCell(row, 'audited_account', 'Audited Account', 'Audited_Account')) || null,
    building_insurance: toText(getCell(row, 'building_insurance', 'Building Insurance')) || null,
    renewal_status: toText(getCell(row, 'renewal_status', 'Renewal Status')) || null,
    agm_status: toText(getCell(row, 'agm_status', 'AGM Status')) || null,

    mc_mcom: toText(getCell(row, 'mc_mcom', 'MC', 'MC/M.Com', 'mc_mcom')) || null,
    engineer: toText(getCell(row, 'engineer', 'Engineer', 'Eng.')) || null,
    management_assistant: toText(getCell(row, 'management_assistant', 'MA', 'Management Assistant')) || null,

    town: toText(getCell(row, 'town', 'Town')) || null,
    council: toText(getCell(row, 'council', 'Council')) || null,

    certificate_file_no: toText(getCell(row, 'certificate_file_no', 'Certificate File No.', 'Certificate_File_No')) || null,
    email_address: toText(getCell(row, 'email_address', 'Email Address', 'Email_Address')) || null,

    awareness_date: coerceDateText(getCell(row, 'awareness_date', 'Awareness Date')) || null,

    // optional: category/status if sheet has them
    category: toText(getCell(row, 'category', 'Category')) || null,
    year: year || null,

    status: deriveStatus(getCell(row, 'status', 'Status')),
  };

  // Ensure all keys exist (helps bulk import)
  for (const k of BACKEND_FIELDS) {
    if (!(k in rec)) rec[k] = null;
  }

  return rec;
}

export default function MComManagement({ currentUser }) {
  const auditUserLabel = currentUser?.name && currentUser?.username
    ? `${currentUser.name} (${currentUser.username})`
    : currentUser?.name || currentUser?.username || '';

  const [mcs, setMcs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const filter = localStorage.getItem('cma_mcom_filter');
    if (filter) {
      localStorage.removeItem('cma_mcom_filter');
      return filter;
    }
    return '';
  });
  const [yearFilter, setYearFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [page, setPage] = useState(1);
  const pageSizeDefault = 20;
  const [viewAll, setViewAll] = useState(false);
  const pageSize = viewAll ? 1000 : pageSizeDefault;
  const [totalCount, setTotalCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState(blankForm());
  const [viewRecord, setViewRecord] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastImportedFileNos, setLastImportedFileNos] = useState([]);
  const confirm = useConfirmDialog();

  const stats = useMemo(() => {
    const total = totalCount;
    const active = mcs.filter((r) => String(r.status).toLowerCase() === 'active').length;
    // M.Com requested statuses are New/Open/Pending/Close, so keep simple:
    const open = mcs.filter((r) => String(r.status).toLowerCase() === 'open').length;
    const pending = mcs.filter((r) => String(r.status).toLowerCase() === 'pending').length;
    return { total, active: open, inactive: total - open, pending };
  }, [mcs, totalCount]);

  const filtered = mcs || [];

  const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

  async function load() {
    setLoading(true);
    try {
      const data = await fetchMComs({
        year: yearFilter || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        q: searchTerm || undefined,
        page: viewAll ? 1 : page,
        limit: pageSize,
      });

      // backend returns {rows,total}
      const rows = data?.rows ?? [];
      setMcs(rows);
      setTotalCount(data?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [statusFilter, yearFilter, categoryFilter, searchTerm, viewAll]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, yearFilter, categoryFilter, searchTerm, page, viewAll]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  function field(key) {
    return (v) => setFormData((p) => ({ ...p, [key]: v }));
  }

  function openAdd() {
    setEditingId(null);
    setFormData(blankForm());
    setModalOpen(true);
  }

  function openEdit(mc) {
    setEditingId(mc.id);
    const f = blankForm();
    Object.keys(f).forEach((k) => {
      f[k] = mc[k] ?? '';
    });
    setFormData(f);
    setModalOpen(true);
  }

  function openView(mc) {
    setViewRecord(mc);
    setViewModalOpen(true);
  }

  async function save() {
    const file_no = toText(formData.new_file_no || formData.old_file_no).trim();
    const management_corporation_name = toText(formData.management_corporation_name).trim();

    if (!file_no) return showToast('File number is required', 'error');
    if (!management_corporation_name) return showToast('Management Corporation Name is required', 'error');

    const payload = {
      ...formData,
      file_no,
      management_corporation_name,
      units: formData.units === '' ? null : toIntOrNull(formData.units),
      year: formData.year === '' ? null : deriveYear(formData.year),
      status: formData.status || 'New',
      ...(auditUserLabel ? { created_by: auditUserLabel, modified_by: auditUserLabel } : {}),
    };

    try {
      if (editingId) {
        const r = await fetch(`${API_BASE}/mcom/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || 'Update failed');
        showToast('M.Com updated ✅');
      } else {
        const r = await fetch(`${API_BASE}/mcom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || 'Create failed');
        showToast('M.Com created ✅');
      }

      setModalOpen(false);
      await load();
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    }
  }

  async function remove(id) {
    const confirmed = await confirm({
      title: 'Delete M.Com record',
      message: 'Delete this M.Com record? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const r = await fetch(`${API_BASE}/mcom/${id}`, { method: 'DELETE' });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Delete failed');
      showToast('Record deleted', 'error');
      await load();
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error');
    }
  }

  async function exportExcel() {
    try {
      showToast('Exporting all M.Com Records...');
      
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/mcom?limit=999999`);
      const result = await response.json();
      const allRecords = result.rows || result || [];
      
      const rows = (allRecords || []).map((r) => ({
        file_no: r.file_no ?? '',
        reg_date: r.reg_date ?? '',
        old_file_no: r.old_file_no ?? '',
        remark: r.remark ?? '',
        new_file_no: r.new_file_no ?? '',
        management_corporation_name: r.management_corporation_name ?? '',
        address: r.address ?? '',
        units: r.units ?? '',
        plan_no: r.plan_no ?? '',
        secretary: r.secretary ?? '',
        secretary_unit_no: r.secretary_unit_no ?? '',
        treasurer: r.treasurer ?? '',
        treasurer_unit_no: r.treasurer_unit_no ?? '',
        renewal_period: r.renewal_period ?? '',
        agm_date: r.agm_date ?? '',
        agm_minutes: r.agm_minutes ?? '',
        attendance: r.attendance ?? '',
        audited_account: r.audited_account ?? '',
        building_insurance: r.building_insurance ?? '',
        renewal_status: r.renewal_status ?? '',
        agm_status: r.agm_status ?? '',
        mc_mcom: r.mc_mcom ?? '',
        engineer: r.engineer ?? '',
        management_assistant: r.management_assistant ?? '',
        town: r.town ?? '',
        council: r.council ?? '',
        certificate_file_no: r.certificate_file_no ?? '',
        email_address: r.email_address ?? '',
        awareness_date: r.awareness_date ?? '',
        category: r.category ?? '',
        year: r.year ?? '',
        status: r.status ?? '',
        created_by: r.created_by ?? '',
        modified_by: r.modified_by ?? '',
        created_at: r.created_at ?? '',
        updated_at: r.updated_at ?? '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'M.Com Records');
      XLSX.writeFile(wb, `CMA_MCom_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Exported ✅');
    } catch (err) {
      showToast(err.message || 'Export failed', 'error');
    }
  }

  async function importExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      let allRows = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = parseSheetRows(ws);
        allRows.push(...rows);
      }
      if (!allRows.length) return showToast('No data found in any sheet', 'error');

      // Some Excel sheets may use different header names for management corporation name.
      // Don’t block import only because `management_corporation_name` didn’t map.
      const records = allRows
        .map(toBackendRecordFromExcelRow)
        .filter((r) => toText(r.file_no) || toText(r.new_file_no) || toText(r.old_file_no))
        .map((record) => ({
          ...record,
          ...(auditUserLabel ? { created_by: auditUserLabel, modified_by: auditUserLabel } : {}),
        }));

      if (!records.length) return showToast('No valid records found (missing file_no)', 'error');

      await importMComsBulk(records);
      showToast(`Imported ${records.length} records ✅`);
      setLastImportedFileNos(records.map((x) => x.file_no).filter(Boolean));
      await load();
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      e.target.value = '';
    }
  }

  async function handleDeleteImported() {
    if (!lastImportedFileNos.length) return showToast('No imported batch to delete', 'error');
    const confirmed = await confirm({
      title: 'Delete imported M.Com records',
      message: `Delete ${lastImportedFileNos.length} imported records? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const res = await deleteMComsBulk(lastImportedFileNos);
      showToast(`Deleted ${res.deleted || lastImportedFileNos.length} records ✅`, 'success');
      setLastImportedFileNos([]);
      await load();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  }

  async function handleDeleteAll() {
    const confirmed = await confirm({
      title: 'Delete all M.Com records',
      message: 'Delete ALL M.Com records? This cannot be undone.',
      confirmLabel: 'Delete all',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const r = await fetch(`${API_BASE}/mcom`, { method: 'DELETE' });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || 'Delete all failed');
      showToast(`Deleted all M.Com records ✅`);
      setLastImportedFileNos([]);
      await load();
    } catch (err) {
      showToast(err.message || 'Delete all failed', 'error');
    }
  }

  const TABLE_HEADERS = [
    'REG DATE',
    'OLD FILE NO',
    'NEW FILE NO',
    'MANAGEMENT CORPORATION',
    'PLAN NO',
    'UNITS',
    'SECRETARY',
    'TOWN',
    'STATUS',
    'ACTIONS',
  ];

  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div style={{ padding: 24, fontFamily: "'DM Sans', sans-serif", background: theme.bg, minHeight: '100vh' }}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
        <span>Home</span> / <span>M.Com Management</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: theme.text }}>M.Com Management</h2>
          <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0 0' }}>M.Com list records</p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={exportExcel} style={btnOutline}>
            <i className="fas fa-download" /> Export
          </button>
          <label style={{ ...btnOutline, cursor: 'pointer', margin: 0 }}>
            <i className="fas fa-upload" /> Import
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={importExcel} />
          </label>
          <button onClick={handleDeleteAll} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete all M.Com Records">
            <i className="fas fa-trash" /> Delete All
          </button>
          {lastImportedFileNos && lastImportedFileNos.length > 0 && (
            <button onClick={handleDeleteImported} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete imported batch">
              <i className="fas fa-trash" /> Delete Imported
            </button>
          )}
          <button onClick={openAdd} style={btnPrimary}>
            <i className="fas fa-plus" /> Add M.Com
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'TOTAL MCOM', value: stats.total, icon: 'fa-folder-open', color: theme.blue },
          { label: 'ACTIVE', value: stats.active, icon: 'fa-check-circle', color: theme.green },
          { label: 'NON ACTIVE', value: stats.inactive, icon: 'fa-ban', color: theme.text2 },
          { label: 'PENDING', value: stats.pending, icon: 'fa-exclamation', color: theme.red },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: theme.card, borderRadius: 12, padding: 18, border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24, color: color || theme.blue, opacity: 0.7 }}>
                <i className={`fas ${icon}`} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: color || theme.text }}>{value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>All M.Com Records</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search M.Com…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', fontSize: 13, width: 220 }}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', fontSize: 13, minWidth: 140 }}>
              <option value="">All Status</option>
              <option value="New">New</option>
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Close">Close</option>
            </select>
            <input type="number" placeholder="Year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', fontSize: 13, width: 120 }} />
            <input type="text" placeholder="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', fontSize: 13, width: 150 }} />
            <button onClick={() => setViewAll((v) => !v)} style={viewAll ? btnPrimary : btnOutline} title="Load up to 1000 rows">
              {viewAll ? 'View Paging' : 'View All (1000)'}
            </button>
          </div>
        </div>

        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: theme.text2 }}>
            Showing <strong>{loading ? 0 : filtered.length}</strong> of <strong>{totalCount}</strong>
          </div>
<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
             {!viewAll && (
               <>
                 <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                   style={page === 1 ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed', padding: '5px 10px', fontSize: 12 } : { ...btnOutline, padding: '5px 10px', fontSize: 12 }}
                 >Prev</button>
                 <span style={{ fontSize: 12, color: theme.text3 }}>Page <strong style={{ color: theme.text }}>{page}</strong> / {maxPage}</span>
                 <button onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}
                   style={page >= maxPage ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed', padding: '5px 10px', fontSize: 12 } : { ...btnOutline, padding: '5px 10px', fontSize: 12 }}
                 >Next</button>
               </>
             )}
             {viewAll && (
               <span style={{ fontSize: 12, color: theme.text3 }}><strong style={{ color: theme.text }}>All (up to 1000)</strong></span>
             )}
           </div>
        </div>

<div style={{ overflowX: 'auto' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
             <colgroup>
               {TABLE_HEADERS.map((h) => (
                 <col key={h} style={{ width: COL_WIDTHS[h] }} />
               ))}
             </colgroup>
             <thead>
               <tr>
                 {TABLE_HEADERS.map((h) => (
                   <th key={h} style={thStyle}>{h}</th>
                 ))}
               </tr>
             </thead>
             <tbody>
               {loading ? (
                 <tr><td colSpan={TABLE_HEADERS.length} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>Loading…</td></tr>
               ) : filtered.length === 0 ? (
                 <tr><td colSpan={TABLE_HEADERS.length} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>No M.Com records found</td></tr>
               ) : (
                 filtered.map((mc) => (
                   <tr key={mc.id} style={{ borderBottom: `1px solid ${theme.border}` }}
                     onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                     onMouseLeave={(e) => e.currentTarget.style.background = ''}
                   >
                     <td style={cellStyle} title={mc.reg_date || '—'}>{mc.reg_date || '—'}</td>
                     <td style={cellStyle} title={mc.old_file_no || '—'}>{mc.old_file_no || '—'}</td>
                     <td style={cellStyle} title={mc.new_file_no || '—'}>{mc.new_file_no || '—'}</td>
                     <td style={cellStyle} title={mc.management_corporation_name || '—'}>{mc.management_corporation_name || '—'}</td>
                     <td style={cellStyle} title={mc.plan_no || '—'}>{mc.plan_no || '—'}</td>
                     <td style={cellStyle}>{mc.units ?? '—'}</td>
                     <td style={cellStyle} title={mc.secretary || '—'}>{mc.secretary || '—'}</td>
                     <td style={cellStyle} title={mc.town || '—'}>{mc.town || '—'}</td>
                     <td style={{ ...cellStyle, overflow: 'visible' }}><StatusPill status={mc.status} /></td>
                     <td style={{ ...cellStyle, overflow: 'visible' }}>
                       <div style={{ display: 'flex', gap: 2 }}>
                         <ActionBtn icon="fas fa-eye" color="#0066cc" title="View" onClick={() => openView(mc)} />
                         <ActionBtn icon="fas fa-history" color="#6b7280" title="History" onClick={() => { setSelectedHistoryRecord(mc); setShowHistoryModal(true); }} />
                         <ActionBtn icon="fas fa-edit" color="#ffc107" title="Edit" onClick={() => openEdit(mc)} />
                         <ActionBtn icon="fas fa-trash" color="#dc3545" title="Delete" onClick={() => remove(mc.id)} />
                       </div>
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
         </div>
      </div>

      {modalOpen && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div style={modalStyle}>
            <div style={modalHeader}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{editingId ? 'Edit M.Com Record' : 'Add M.Com Record'}</span>
              <button onClick={() => setModalOpen(false)} style={closeBtnStyle}>✕</button>
            </div>

            <div style={{ padding: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
              <SectionLabel>Identity &amp; Filing</SectionLabel>
              <FormField label="Reg Date" value={formData.reg_date} onChange={field('reg_date')} />
              <FormField label="Old File No" value={formData.old_file_no} onChange={field('old_file_no')} />
              <FormField label="New File No *" value={formData.new_file_no} onChange={field('new_file_no')} />
              <FormField label="Management Corporation Name *" value={formData.management_corporation_name} onChange={field('management_corporation_name')} span2 />
              <FormField label="Address" value={formData.address} onChange={field('address')} span2 />
              <FormField label="Plan No" value={formData.plan_no} onChange={field('plan_no')} />
              <FormField label="Units" value={formData.units} onChange={field('units')} />
              <FormField label="Council" value={formData.council} onChange={field('council')} />
              <FormField label="Town" value={formData.town} onChange={field('town')} />
              <FormField label="Certificate File No" value={formData.certificate_file_no} onChange={field('certificate_file_no')} />
              <FormField label="Email Address" type="email" value={formData.email_address} onChange={field('email_address')} span2 />
              <FormField label="Awareness Date" value={formData.awareness_date} onChange={field('awareness_date')} />
              <FormField label="Remark" value={formData.remark} onChange={field('remark')} span2 />

              <SectionLabel>Personnel</SectionLabel>
              <FormField label="Secretary" value={formData.secretary} onChange={field('secretary')} />
              <FormField label="Secretary Unit No" value={formData.secretary_unit_no} onChange={field('secretary_unit_no')} />
              <FormField label="Treasurer" value={formData.treasurer} onChange={field('treasurer')} />
              <FormField label="Treasurer Unit No" value={formData.treasurer_unit_no} onChange={field('treasurer_unit_no')} />
              <FormField label="Engineer" value={formData.engineer} onChange={field('engineer')} />
              <FormField label="Management Assistant" value={formData.management_assistant} onChange={field('management_assistant')} />
              <FormField label="MC/M.Com" value={formData.mc_mcom} onChange={field('mc_mcom')} />

              <SectionLabel>AGM / Renewal</SectionLabel>
              <FormField label="Renewal Period" value={formData.renewal_period} onChange={field('renewal_period')} />
              <FormField label="AGM Date" value={formData.agm_date} onChange={field('agm_date')} />
              <FormField label="AGM Minutes" value={formData.agm_minutes} onChange={field('agm_minutes')} />
              <FormField label="Attendance" value={formData.attendance} onChange={field('attendance')} />
              <FormField label="Renewal Status" value={formData.renewal_status} onChange={field('renewal_status')} />
              <FormField label="AGM Status" value={formData.agm_status} onChange={field('agm_status')} />
              <FormField label="Audited Account" value={formData.audited_account} onChange={field('audited_account')} />
              <FormField label="Building Insurance" value={formData.building_insurance} onChange={field('building_insurance')} />

              <SectionLabel>Category / Status</SectionLabel>
              <FormField label="Year" type="number" value={formData.year} onChange={field('year')} />
              <FormField label="Category" value={formData.category} onChange={field('category')} />
              <FormSelect
                label="Status"
                value={formData.status}
                onChange={field('status')}
                options={['New', 'Open', 'Pending', 'Close']}
              />
            </div>

            <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModalOpen(false)} style={btnOutline}>Cancel</button>
              <button onClick={save} style={btnPrimary}>
                <i className="fas fa-save" /> {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewModalOpen && viewRecord && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setViewModalOpen(false)}>
          <div style={{ ...modalStyle, maxWidth: 1000 }}>
            <div style={modalHeader}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>M.Com Record Details</span>
              <button onClick={() => setViewModalOpen(false)} style={closeBtnStyle}>✕</button>
            </div>

            <div style={{ padding: 22, maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>
                Identity &amp; Filing
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
                <ViewField label="Reg Date" value={viewRecord.reg_date} />
                <ViewField label="Old File No" value={viewRecord.old_file_no} />
                <ViewField label="New File No" value={viewRecord.new_file_no} />
                <ViewField label="Management Corporation Name" value={viewRecord.management_corporation_name} />
                <ViewField label="Address" value={viewRecord.address} />
                <ViewField label="Plan No" value={viewRecord.plan_no} />
                <ViewField label="Units" value={viewRecord.units} />
                <ViewField label="Town" value={viewRecord.town} />
                <ViewField label="Council" value={viewRecord.council} />
                <ViewField label="Certificate File No" value={viewRecord.certificate_file_no} />
                <ViewField label="Email Address" value={viewRecord.email_address} />
                <ViewField label="Awareness Date" value={viewRecord.awareness_date} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>
                Personnel
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
                <ViewField label="Secretary" value={viewRecord.secretary} />
                <ViewField label="Secretary Unit No" value={viewRecord.secretary_unit_no} />
                <ViewField label="Treasurer" value={viewRecord.treasurer} />
                <ViewField label="Treasurer Unit No" value={viewRecord.treasurer_unit_no} />
                <ViewField label="Engineer" value={viewRecord.engineer} />
                <ViewField label="Management Assistant" value={viewRecord.management_assistant} />
                <ViewField label="MC/M.Com" value={viewRecord.mc_mcom} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>
                AGM / Renewal
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
                <ViewField label="Renewal Period" value={viewRecord.renewal_period} />
                <ViewField label="AGM Date" value={viewRecord.agm_date} />
                <ViewField label="AGM Minutes" value={viewRecord.agm_minutes} />
                <ViewField label="Attendance" value={viewRecord.attendance} />
                <ViewField label="Audited Account" value={viewRecord.audited_account} />
                <ViewField label="Building Insurance" value={viewRecord.building_insurance} />
                <ViewField label="Renewal Status" value={viewRecord.renewal_status} />
                <ViewField label="AGM Status" value={viewRecord.agm_status} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Status:</span>
                <StatusPill status={viewRecord.status} />
              </div>

              {/* Audit / timestamps */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
                <ViewField label="Created At" value={viewRecord.created_at || '—'} />
                <ViewField label="Updated At" value={viewRecord.updated_at || '—'} />
              </div>
            </div>

            <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setViewModalOpen(false); openEdit(viewRecord); }} style={btnPrimary}>
                <i className="fas fa-edit" /> Edit
              </button>
              <button onClick={() => setViewModalOpen(false)} style={btnOutline}>Close</button>
            </div>
          </div>
        </div>
      )}

      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => { setShowHistoryModal(false); setSelectedHistoryRecord(null); }}
        record={selectedHistoryRecord}
        theme={theme}
      />

      {toast && (
        <div style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 9999, background: '#fff', border: `1px solid ${theme.border}`, borderLeft: `4px solid ${toast.type === 'error' ? theme.red : toast.type === 'info' ? theme.blue : theme.green}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px rgba(0,0,0,.12)', minWidth: 240 }}>
          <i className={`fas fa-${toast.type === 'error' ? 'times-circle' : 'check-circle'}`} style={{ color: toast.type === 'error' ? theme.red : theme.green, fontSize: 15 }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}