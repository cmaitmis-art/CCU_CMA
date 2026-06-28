import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useConfirmDialog } from '../ConfirmDialogContext.jsx';
import '../CMAStyles.css';
import HistoryModal from '../components/HistoryModal.jsx';
window.XLSX = XLSX;

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
  orange: '#ea580c',
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

const CATEGORIES_BY_SECTION = {
  'A. Administration': [
    'Non Payment',
    'Pet Keeping',
    'Parking Issues (Unit Owners)',
    'Accounts related Issues',
    'Council Issues',
    'Garbage Issues',
    'Common Elements Issues',
    'Other Issues',
  ],
  'B. Technical': [
    'Unauthorised Construction',
    'Water Leakage',
    'Sinking Fund',
    'Common area issue',
    'Boundry Issues',
    'Developer Related Issues (Construction)',
    'Other Issues',
  ],
  'C. Legal': [
    'Developer Related Issues (Legal Issue)',
    'Common Elements Issue (Developer)',
    'Non registration of Condominium Plan',
    'Boundry Issues',
    'Business Purpose',
    'Defects',
    'Other Issues',
  ],
};

const ALL_CATEGORIES = Object.values(CATEGORIES_BY_SECTION).flat();
const STATUS_OPTIONS = ['New', 'Open', 'Pending', 'Closed'];
const STATUS_COLORS = {
  'New': '#2563eb',
  'Open': '#f59e0b',
  'Pending': '#ef4444',
  'Closed': '#10b981',
};

const SECTION_KEYS = ['reg date', 'old file no', 'new file no', 'management corporation', 'plan no', 'units', 'secretary', 'town', 'status'];

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
  color: '#94a0b4',
  textTransform: 'uppercase',
  letterSpacing: '.6px',
  background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  whiteSpace: 'nowrap',
};

// Column widths for Complaints table
const TABLE_HEADERS = ['FILE NO', 'NAME OF THE APARTMENT', 'ADDRESS', 'DATE', 'REASON', 'COMPLAINER DETAILS', 'REGISTERED CCU FILE NO', 'REMARKS', 'STATUS', 'ACTIONS'];
const COL_WIDTHS = {
  'FILE NO': 110,
  'NAME OF THE APARTMENT': 180,
  'ADDRESS': 180,
  'DATE': 90,
  'REASON': 200,
  'COMPLAINER DETAILS': 160,
  'REGISTERED CCU FILE NO': 140,
  'REMARKS': 200,
  'STATUS': 90,
  'ACTIONS': 110,
};

function pad2(value) {
  return String(value).padStart(2, '0');
}

function parseFlexibleDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  // Handle Excel serial numbers (numeric values)
  if (typeof value === 'number') {
    if (window.XLSX && window.XLSX.SSF) {
      try {
        const parsed = window.XLSX.SSF.parse_date_code(value);
        if (parsed && parsed.y && parsed.m && parsed.d) {
          const d = new Date(parsed.y, parsed.m - 1, parsed.d);
          if (!Number.isNaN(d.getTime())) return d;
        }
      } catch (e) {
        console.warn('Failed to parse Excel date code:', value, e);
      }
    }
    // Fallback: treat as days since 1900 (Excel format)
    try {
      const excelEpoch = new Date(1900, 0, 1);
      const d = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() > 1800 && d.getFullYear() < 2100) {
        return d;
      }
    } catch (e) {
      console.warn('Failed to parse numeric date:', value, e);
    }
  }

  const text = toText(value).trim();
  if (!text) return null;

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    let [, day, month, year] = dmy;
    day = parseInt(day, 10);
    month = parseInt(month, 10);
    year = parseInt(year, 10);
    
    if (year < 100) year += 2000;
    
    // Validate
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      try {
        const d = new Date(year, month - 1, day);
        if (!Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
          return d;
        }
      } catch (e) {
        console.warn('Failed to parse DMY date:', text, e);
      }
    }
  }

  // Try YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
  const ymd = text.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (ymd) {
    let [, year, month, day] = ymd;
    month = parseInt(month, 10);
    day = parseInt(day, 10);
    
    // Validate
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      try {
        const d = new Date(year, month - 1, day);
        if (!Number.isNaN(d.getTime()) && d.getFullYear() === parseInt(year, 10)) {
          return d;
        }
      } catch (e) {
        console.warn('Failed to parse YMD date:', text, e);
      }
    }
  }

  // Last resort: try native Date parsing
  try {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  } catch (e) {
    console.warn('Failed to parse date with native Date:', text, e);
  }

  return null;
}

function formatDisplayDate(v) {
  if (!v) return '—';
  const date = parseFlexibleDate(v);
  if (date) {
    return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
  }
  const d = String(v).trim();
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return d;
}

function normalizeKey(k) {
  // Normalize header keys: remove diacritics, replace non-alphanumerics with spaces,
  // collapse spaces and lowercase — this makes matching robust to underscores/punctuation.
  const s = String(k || '');
  let out = s;
  if (typeof out.normalize === 'function') {
    out = out.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  }
  return out.replace(/[^a-z0-9]+/gi, ' ').trim().replace(/\s+/g, ' ').toLowerCase();
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

function normalizeExcelDate(value) {
  if (value === null || value === undefined || value === '') return '';
  try {
    const date = parseFlexibleDate(value);
    if (date && !Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  } catch (e) {
    console.warn('Error normalizing date:', value, e);
  }
  // Return empty string for invalid dates instead of raw text
  return '';
}

function buildRowObjectFromArray(row) {
  const values = Array.isArray(row) ? row.map((v) => toText(v)) : [];
  const fileNoIndex = values.findIndex((v) => /^(?:cma\/?ccu|ccu|cf|file)[\s\/-]?\d+/i.test(v));
  if (fileNoIndex >= 0) {
    return {
      file_no: values[fileNoIndex] || '',
      name_of_apartment: values[fileNoIndex + 1] || '',
      address: values[fileNoIndex + 2] || '',
      date: normalizeExcelDate(values[fileNoIndex + 3]) || '',
      reason: values[fileNoIndex + 4] || '',
      complainer_details: values[fileNoIndex + 5] || '',
      registered_ccu_file_no: values[fileNoIndex + 6] || '',
      remarks: values[fileNoIndex + 7] || '',
      status: values[fileNoIndex + 8] || '',
    };
  }

  if (values.length >= 9 && /^[0-9]+$/.test(values[0])) {
    return {
      file_no: values[1] || '',
      name_of_apartment: values[2] || '',
      address: values[3] || '',
      date: normalizeExcelDate(values[4]) || '',
      reason: values[5] || '',
      complainer_details: values[6] || '',
      registered_ccu_file_no: values[7] || '',
      remarks: values[8] || '',
      status: values[9] || '',
    };
  }

  if (values.length >= 8) {
    return {
      file_no: values[0] || '',
      name_of_apartment: values[1] || '',
      address: values[2] || '',
      date: normalizeExcelDate(values[3]) || '',
      reason: values[4] || '',
      complainer_details: values[5] || '',
      registered_ccu_file_no: values[6] || '',
      remarks: values[7] || '',
      status: values[8] || '',
    };
  }

  return null;
}

function sheetToRowObjects(ws) {
  const rawRows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  if (!rawRows.length) return [];

  const headerRow = rawRows[0].map((v) => toText(v));
  const normalizedHeaders = headerRow.map(normalizeKey);
  const headerKeywords = [
    'file no', 'file_no', 'file number', 'name of the apartment', 'name of apartment', 'address', 'date', 'reason', 'complainer details', 'complainer', 'complainant', 'registered ccu file no', 'ccu file no', 'remarks', 'status', 'category', 'registered ccu file no', 'registered_ccu_file_no', 'remarks', 'registered ccu file no'
  ];

  const hasKnownHeader = normalizedHeaders.some((value) => headerKeywords.includes(value));
  if (hasKnownHeader) {
    return rawRows.slice(1).map((row) => {
      const obj = {};
      row.forEach((cell, index) => {
        const key = normalizeKey(headerRow[index]) || `__col_${index}`;
        obj[key] = cell;
      });
      return obj;
    });
  }

  return rawRows.map((row) => buildRowObjectFromArray(row)).filter(Boolean);
}

function calculateDaysElapsed(dateStr) {
  if (!dateStr) return null;
  try {
    const d = parseFlexibleDate(dateStr);
    if (!d || Number.isNaN(d.getTime())) return null;
    const now = new Date();
    const days = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    return days;
  } catch (e) {
    console.warn('Error calculating days elapsed:', dateStr, e);
    return null;
  }
}

function toBackendRecordFromExcelRow(row) {
  let file_no = toText(getCell(row, 'File No', 'file_no', 'FILE NO', 'File No.', 'File Number'));
  const name_of_apartment = toText(getCell(row, 'Name of the Apartment', 'name_of_apartment', 'Apartment', 'NAME OF APARTMENT'));
  const address = toText(getCell(row, 'Address', 'address', 'ADDRESS'));
  const date = normalizeExcelDate(getCell(row, 'Date', 'date', 'DATE'));
  const reason = toText(getCell(row, 'Reason', 'reason', 'REASON'));
  const complainer_details = toText(getCell(row, 'Complainer Details', 'complainer_details', 'Complainer', 'Complainer Details', 'COMPLAINER DETAILS', 'COMPLAINANT'));
  const registered_ccu_file_no = toText(getCell(row, 'Registered CCU File No', 'registered_ccu_file_no', 'CCU File No', 'REGISTERED CCU FILE NO'));
  let remarks = toText(getCell(row, 'Remarks', 'remarks', 'REMARKS', 'Remark'));
  
  // Parse or infer Category
  let category = toText(getCell(row, 'Category', 'category', 'CATEGORY'));
  if (!category && reason) {
    const reasonLower = reason.toLowerCase();
    if (reasonLower.includes('leak') || reasonLower.includes('sewerage') || reasonLower.includes('plumbing') || reasonLower.includes('water')) {
      category = 'Water Leakage';
    } else if (reasonLower.includes('garbage') || reasonLower.includes('waste') || reasonLower.includes('disposal') || reasonLower.includes('trash')) {
      category = 'Garbage Issues';
    } else if (reasonLower.includes('construction') || reasonLower.includes('unauthorised') || reasonLower.includes('unauthorized') || reasonLower.includes('renovation')) {
      category = 'Unauthorised Construction';
    } else if (reasonLower.includes('elevator') || reasonLower.includes('lift') || reasonLower.includes('maintenance') || reasonLower.includes('common area') || reasonLower.includes('corridor') || reasonLower.includes('lobby')) {
      category = 'Common area issue';
    } else if (reasonLower.includes('agm') || reasonLower.includes('council') || reasonLower.includes('committee') || reasonLower.includes('meeting') || reasonLower.includes('election')) {
      category = 'Council Issues';
    } else if (reasonLower.includes('accounts') || reasonLower.includes('finance') || reasonLower.includes('audit') || reasonLower.includes('payment') || reasonLower.includes('non payment')) {
      category = 'Accounts related Issues';
    } else if (reasonLower.includes('parking')) {
      category = 'Parking Issues (Unit Owners)';
    } else if (reasonLower.includes('pet') || reasonLower.includes('dog') || reasonLower.includes('cat')) {
      category = 'Pet Keeping';
    } else if (reasonLower.includes('boundary') || reasonLower.includes('land') || reasonLower.includes('wall')) {
      category = 'Boundry Issues';
    } else {
      category = 'Other Issues';
    }
  }

  // Parse or infer Status
  const statusRaw = toText(getCell(row, 'Status', 'status', 'STATUS'));
  const normalizedStatus = statusRaw.trim().toLowerCase();
  const statusMap = {
    new: 'New',
    open: 'Open',
    pending: 'Pending',
    closed: 'Closed',
    'in progress': 'Open',
    inprogress: 'Open',
  };
  
  let status = 'New';
  if (normalizedStatus && statusMap[normalizedStatus]) {
    status = statusMap[normalizedStatus];
  } else if (remarks) {
    const remLower = remarks.toLowerCase();
    if (remLower.includes('resolved') || remLower.includes('conducted') || remLower.includes('completed') || remLower.includes('settled') || remLower.includes('closed') || remLower.includes('solved') || remLower.includes('done')) {
      status = 'Closed';
    } else if (remLower.includes('pending') || remLower.includes('waiting') || remLower.includes('defer') || remLower.includes('delay')) {
      status = 'Pending';
    } else if (remLower.includes('scheduled') || remLower.includes('issued') || remLower.includes('warned') || remLower.includes('progress') || remLower.includes('ongoing') || remLower.includes('inspection') || remLower.includes('investigating')) {
      status = 'Open';
    }
  }

  // If file_no missing, try to locate it elsewhere in the row values using heuristics
  if (!file_no) {
    const vals = Object.values(row || {}).map((v) => toText(v)).filter(Boolean);
    for (const v of vals) {
      const cand = String(v).trim();
      if (/\bCF[- ]?\d{2,6}[- ]?\d{1,6}\b/i.test(cand) || /\bCCU[- ]?\d{2,6}[- ]?\d{1,6}\b/i.test(cand)) {
        file_no = cand;
        break;
      }
    }
    // broader fallback: any token with letter(s)-digits pattern
    if (!file_no) {
      for (const v of vals) {
        const cand = String(v).trim();
        if (/[A-Za-z]{1,4}[- ]?\d{2,8}[- ]?\d{1,6}/.test(cand)) {
          file_no = cand;
          break;
        }
      }
    }
  }

  // Fallback: if `file_no` missing, use `registered_ccu_file_no` when available
  if (!file_no && registered_ccu_file_no) file_no = registered_ccu_file_no;

  // Final fallback: generate a unique placeholder so import doesn't skip the row
  if (!file_no) {
    file_no = `IMPORT-${new Date().toISOString().replace(/[^0-9]/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`;
    remarks = remarks ? `${remarks} | generated_file_no:${file_no}` : `generated_file_no:${file_no}`;
    console.warn('Generated placeholder file_no for row', { file_no, row });
  }

  return {
    file_no,
    name_of_apartment,
    address,
    date,
    reason,
    complainer_details,
    registered_ccu_file_no,
    remarks,
    category,
    title: name_of_apartment,
    status,
  };
}

function FormModal({ isOpen, onClose, onSave, initialData = null }) {
  const [form, setForm] = useState(initialData || {
    file_no: '',
    name_of_apartment: '',
    address: '',
    date: '',
    reason: '',
    complainer_details: '',
    registered_ccu_file_no: '',
    remarks: '',
    category: '',
    status: 'New',
  });

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  if (!isOpen) return null;

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: theme.card,
        borderRadius: 12,
        boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
        maxWidth: 600,
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, color: theme.text, fontSize: 16, fontWeight: 600 }}>
            {initialData ? 'Edit C-File' : 'Add New C-File'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: theme.text3 }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: theme.text }}>
                File No *
              </label>
              <input
                type="text"
                placeholder="CF-2026-001"
                value={form.file_no}
                onChange={(e) => setField('file_no', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: `1px solid ${theme.border}`,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: theme.text }}>
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setField('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: `1px solid ${theme.border}`,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: theme.text }}>
              Name of Apartment
            </label>
            <input
              type="text"
              placeholder="Building A, Unit 05"
              value={form.name_of_apartment}
              onChange={(e) => setField('name_of_apartment', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: theme.text }}>
              Address
            </label>
            <input
              type="text"
              placeholder="123 Main Street, Colombo 03"
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: theme.text }}>
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setField('date', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: `1px solid ${theme.border}`,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: theme.text }}>
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: `1px solid ${theme.border}`,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                <option value="">— Select Category —</option>
                {Object.entries(CATEGORIES_BY_SECTION).map(([section, cats]) => (
                  <optgroup key={section} label={section}>
                    {cats.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: theme.text }}>
              Reason
            </label>
            <textarea
              placeholder="Describe the complaint reason…"
              value={form.reason}
              onChange={(e) => setField('reason', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                fontSize: 13,
                fontFamily: 'inherit',
                minHeight: 80,
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: theme.text }}>
              Complainer Details
            </label>
            <input
              type="text"
              placeholder="Name, Contact, Email"
              value={form.complainer_details}
              onChange={(e) => setField('complainer_details', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: theme.text }}>
                Registered CCU File No
              </label>
              <input
                type="text"
                placeholder="CCU-2026-001"
                value={form.registered_ccu_file_no}
                onChange={(e) => setField('registered_ccu_file_no', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: `1px solid ${theme.border}`,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: theme.text }}>
              Remarks
            </label>
            <textarea
              placeholder="Additional remarks…"
              value={form.remarks}
              onChange={(e) => setField('remarks', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                fontSize: 13,
                fontFamily: 'inherit',
                minHeight: 80,
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${theme.border}`,
          display: 'flex',
          gap: 10,
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{ ...btnOutline, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            style={{ ...btnPrimary, cursor: 'pointer' }}
          >
            <i className="fas fa-save" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewModal({ isOpen, onClose, record = null, onEdit, onDelete }) {
  if (!isOpen || !record) return null;

  const daysElapsed = calculateDaysElapsed(record.date);
  const isPending = daysElapsed > 15;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: theme.card,
        borderRadius: 12,
        boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
        maxWidth: 700,
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, color: theme.text, fontSize: 16, fontWeight: 600 }}>
            C-File Details
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: theme.text3 }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>File No</div>
              <div style={{ fontSize: 15, fontWeight: 400, color: theme.text }}>{record.file_no}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>Status</div>
              <span style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: 999,
                background: `${STATUS_COLORS[record.status] || theme.blue}20`,
                color: STATUS_COLORS[record.status] || theme.blue,
                fontSize: 13,
                fontWeight: 600,
              }}>
                {record.status}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${theme.border}` }}>
            <div>
              <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>Date</div>
              <div style={{ fontSize: 14, color: theme.text }}>
                {formatDisplayDate(record.date)}
                {daysElapsed !== null && (
                  <div style={{ fontSize: 12, color: isPending ? theme.red : theme.text2, marginTop: 4, fontWeight: 500 }}>
                    {daysElapsed} days elapsed {isPending ? '(PENDING)' : ''}
                  </div>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>Category</div>
              <span style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: 6,
                background: '#f0f0f0',
                color: '#333',
                fontSize: 13,
              }}>
                {record.category || '—'}
              </span>
            </div>
          </div>

          {/* Audit / timestamps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>Created By</div>
              <div style={{ fontSize: 13, color: theme.text2 }}>{record.created_by || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>Created At</div>
              <div style={{ fontSize: 13, color: theme.text2 }}>{record.created_at || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>Modified By</div>
              <div style={{ fontSize: 13, color: theme.text2 }}>{record.modified_by || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>Updated At</div>
              <div style={{ fontSize: 13, color: theme.text2 }}>{record.updated_at || '—'}</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>Apartment</div>
            <div style={{ fontSize: 14, color: theme.text }}>{record.name_of_apartment || '—'}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>Address</div>
            <div style={{ fontSize: 14, color: theme.text }}>{record.address || '—'}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>Reason</div>
            <div style={{ fontSize: 13, color: theme.text2, lineHeight: 1.6 }}>{record.reason || '—'}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>Complainer Details</div>
            <div style={{ fontSize: 13, color: theme.text2 }}>{record.complainer_details || '—'}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>CCU File No</div>
            <div style={{ fontSize: 13, color: theme.text2 }}>{record.registered_ccu_file_no || '—'}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 400, marginBottom: 4 }}>Remarks</div>
            <div style={{ fontSize: 13, color: theme.text2, lineHeight: 1.6 }}>{record.remarks || '—'}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${theme.border}`,
          display: 'flex',
          gap: 10,
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => {
              onDelete(record.id);
              onClose();
            }}
            style={{ ...btnOutline, cursor: 'pointer', color: theme.red, borderColor: theme.red }}
          >
            <i className="fas fa-trash" /> Delete
          </button>
          <button
            onClick={() => {
              onEdit(record);
              onClose();
            }}
            style={{ ...btnPrimary, cursor: 'pointer' }}
          >
            <i className="fas fa-edit" /> Edit
          </button>
          <button
            onClick={onClose}
            style={{ ...btnOutline, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CFiles() {
  const [cfiles, setCfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSizeDefault = 20;
  const [totalCount, setTotalCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [lastImportedFileNos, setLastImportedFileNos] = useState([]);
  const confirm = useConfirmDialog();

  const pageSize = pageSizeDefault;
  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));

  async function load() {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const params = new URLSearchParams({
        limit: pageSize,
        page: page,
      });
      if (searchTerm?.trim()) params.append('q', searchTerm.trim());
      if (categoryFilter?.trim()) params.append('category', categoryFilter.trim());
      if (statusFilter) params.append('status', statusFilter);

      const r = await fetch(`${API_BASE}/cfiles?${params.toString()}`);
      const data = await r.json();
      setCfiles(data?.rows ?? []);
      setTotalCount(data?.total ?? 0);
    } catch (err) {
      showToast('Failed to load C-Files', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, categoryFilter, statusFilter]);

  // Debug: verify filter values coming from the UI

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSaveRecord(record) {
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      
      if (editingRecord) {
        const r = await fetch(`${API_BASE}/cfiles/${editingRecord.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
        if (!r.ok) throw new Error('Failed to update');
      } else {
        const r = await fetch(`${API_BASE}/cfiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
        if (!r.ok) throw new Error('Failed to create');
      }

      showToast(editingRecord ? 'Updated ✅' : 'Created ✅');
      setShowFormModal(false);
      setEditingRecord(null);
      load();
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    }
  }

  async function handleDeleteRecord(id) {
    const confirmed = await confirm({
      title: 'Delete C-File',
      message: 'Delete this C-File permanently? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const r = await fetch(`${API_BASE}/cfiles/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed to delete');
      showToast('Deleted ✅');
      load();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  }

  async function handleDeleteImported() {
    if (!lastImportedFileNos || !lastImportedFileNos.length) return showToast('No imported batch to delete', 'error');
    const confirmed = await confirm({
      title: 'Delete imported records',
      message: `Delete ${lastImportedFileNos.length} imported records? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const r = await fetch(`${API_BASE}/cfiles/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_nos: lastImportedFileNos }),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || 'Delete failed');
      showToast(`Deleted ${res.deleted} records ✅`);
      setLastImportedFileNos([]);
      load();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  }

  async function handleDeleteAll() {
    const confirmed = await confirm({
      title: 'Delete all C-Files',
      message: 'Delete ALL C-File records? This cannot be undone.',
      confirmLabel: 'Delete all',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const r = await fetch(`${API_BASE}/cfiles`, { method: 'DELETE' });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || 'Delete all failed');
      showToast(`Deleted all C-Files ✅`);
      setLastImportedFileNos([]);
      load();
    } catch (err) {
      showToast(err.message || 'Delete all failed', 'error');
    }
  }

  async function exportExcel() {
    try {
      if (typeof window.XLSX === 'undefined') return showToast('XLSX library not loaded', 'error');
      showToast('Exporting all C-Files...');
      
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/cfiles?limit=999999`);
      const result = await response.json();
      const allCfiles = result.rows || result || [];
      
      const rows = (allCfiles || []).map((r) => ({
        'File No': r.file_no ?? '',
        'Name of the Apartment': r.name_of_apartment ?? '',
        'Address': r.address ?? '',
        'Date': r.date ?? '',
        'Reason': r.reason ?? '',
        'Complainer Details': r.complainer_details ?? '',
        'Registered CCU File No': r.registered_ccu_file_no ?? '',
        'Title': r.title ?? '',
        'File Type': r.file_type ?? '',
        'Category': r.category ?? '',
        'Remarks': r.remarks ?? '',
        'Status': r.status ?? '',
        'Created At': r.created_at ?? '',
        'Updated At': r.updated_at ?? '',
      }));
      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'C-Files');
      window.XLSX.writeFile(wb, `CMA_CFiles_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Exported ✅');
    } catch (err) {
      showToast(err.message || 'Export failed', 'error');
    }
  }

  async function importExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (typeof window.XLSX === 'undefined') return showToast('XLSX library not loaded', 'error');
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      });
      const wb = window.XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true });
      let allRows = [];
      for (const sheetName of wb.SheetNames) {
        try {
          const ws = wb.Sheets[sheetName];
          const rows = sheetToRowObjects(ws);
          allRows.push(...rows);
        } catch (sheetErr) {
          console.warn(`Error processing sheet "${sheetName}":`, sheetErr);
          showToast(`Warning: Error in sheet "${sheetName}" - continuing with other sheets`, 'error');
        }
      }
      if (!allRows.length) return showToast('No data found in sheets', 'error');
      
      const records = [];
      const errors = [];
      
      allRows.forEach((row, idx) => {
        try {
          const record = toBackendRecordFromExcelRow(row);
          if (record) records.push(record);
        } catch (rowErr) {
          console.warn(`Error processing row ${idx}:`, rowErr, row);
          errors.push(`Row ${idx + 1}: ${rowErr.message}`);
        }
      });

      if (!records.length) return showToast('No valid data rows found in sheets', 'error');

      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const r = await fetch(`${API_BASE}/cfiles/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || 'Import failed');
      showToast(`Imported ${records.length} records ✅`);
      // remember imported file numbers so user can delete that batch if needed
      setLastImportedFileNos(records.map((x) => x.file_no));
      load();
      
      if (errors.length > 0) {
        console.warn(`Import succeeded but ${errors.length} rows had issues:`, errors);
      }
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
      console.error('Import error:', err);
    } finally {
      e.target.value = '';
    }
  }

  const stats = useMemo(() => {
    const pending = cfiles.filter((r) => calculateDaysElapsed(r.date) > 15).length;
    const categories = new Set(cfiles.map((r) => r.category).filter(Boolean));
    const byStatus = {};
    cfiles.forEach((r) => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });
    return { pending, totalCategories: categories.size, byStatus };
  }, [cfiles]);

  return (
    <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", background: theme.bg, minHeight: '100vh' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
        <span>Home</span> / <span>Complaint Management</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: theme.text }}>Complaint Management</h2>
          <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0 0' }}>Complaint File records tracking and management</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={exportExcel} style={btnOutline}><i className="fas fa-download" /> Export</button>
          <label style={{ ...btnOutline, cursor: 'pointer', margin: 0 }}>
            <i className="fas fa-upload" /> Import
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={importExcel} />
          </label>
          <button onClick={handleDeleteAll} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete all C-Files">
            <i className="fas fa-trash" /> Delete All
          </button>
          {lastImportedFileNos && lastImportedFileNos.length > 0 && (
            <button onClick={handleDeleteImported} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete imported batch">
              <i className="fas fa-trash" /> Delete Imported
            </button>
          )}
          <button onClick={() => { setEditingRecord(null); setShowFormModal(true); }} style={btnPrimary}>
            <i className="fas fa-plus" /> Add C-File
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'TOTAL', value: totalCount, icon: 'fa-folder' },
          { label: 'PENDING', value: stats.pending, icon: 'fa-exclamation', color: theme.red },
          { label: 'CATEGORIES', value: stats.totalCategories, icon: 'fa-tags' },
          { label: 'NEW', value: stats.byStatus['New'] || 0, icon: 'fa-star', color: '#2563eb' },
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

      {/* Pending Details Section */}
      {stats.pending > 0 && (
        <div style={{ background: '#fff8e1', borderRadius: 12, border: `2px solid ${theme.orange}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', marginBottom: 16, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '16px 18px', background: theme.orange, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-clock" style={{ fontSize: 18 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>⚠️ Pending Items ({stats.pending})</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Files pending for more than 15 days</div>
            </div>
          </div>
          
          {/* Pending Items List */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {cfiles.filter((r) => calculateDaysElapsed(r.date) > 15).map((pending) => {
              const days = calculateDaysElapsed(pending.date);
              return (
<div
                      key={pending.id}
                      onClick={() => { setSelectedRecord(pending); setShowViewModal(true); }}
                      style={{
                        padding: '12px 18px',
                        borderBottom: `1px solid #ffe4b5`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: '.2s',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fff5e6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, color: theme.text, fontSize: 14 }}>
                        {pending.file_no}
                      </div>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: theme.red,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {days} days
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: theme.text2, marginBottom: 4 }}>
                      <strong>Reason:</strong> {pending.reason || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: theme.text3 }}>
                      {pending.name_of_apartment} • {pending.address}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.blue }}>
                      Click to view details →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table Card */}
      <div style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', overflow: 'hidden' }}>

        {/* Filters */}
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>Complaint Records</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Search…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', fontSize: 13, width: 180 }} />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', fontSize: 13, minWidth: 180 }}>
              <option value="">All Categories</option>
              {Object.entries(CATEGORIES_BY_SECTION).map(([section, cats]) => (
                <optgroup key={section} label={section}>
                  {cats.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', fontSize: 13, minWidth: 140 }}>
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pagination */}
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: theme.text2 }}>
            Showing <strong>{loading ? 0 : cfiles.length}</strong> of <strong>{totalCount}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              style={page === 1 ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed' } : btnOutline}>◀ Prev</button>
            <span style={{ fontSize: 13, color: theme.text3 }}>Page <strong style={{ color: theme.text }}>{page}</strong> / {maxPage}</span>
            <button onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}
              style={page >= maxPage ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed' } : btnOutline}>Next ▶</button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                {Object.keys(COL_WIDTHS).map((label) => (
                  <th key={label} style={label === 'ACTIONS' ? { ...thStyle, textAlign: 'center', width: COL_WIDTHS[label] } : { ...thStyle, width: COL_WIDTHS[label] }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>Loading…</td></tr>
              ) : cfiles.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>No C-Files found</td></tr>
              ) : (
                cfiles.map((cf) => {
                  const days = calculateDaysElapsed(cf.date);
                  const isPending = days > 15;
                  return (
                    <tr
                      key={cf.id}
                      style={{ 
                        borderBottom: `1px solid ${theme.border}`,
                        background: isPending ? '#fffbeb' : 'transparent',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = isPending ? '#fef3c7' : '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = isPending ? '#fffbeb' : '')}
                    >
                      <td style={{ ...cellStyle, color: isPending ? theme.orange : theme.text, fontWeight: 500 }} title={cf.file_no}>{cf.file_no}</td>
                      <td style={cellStyle} title={cf.name_of_apartment}>{cf.name_of_apartment || '—'}</td>
                      <td style={cellStyle} title={cf.address}>{cf.address || '—'}</td>
                      <td style={cellStyle} title={formatDisplayDate(cf.date)}>{formatDisplayDate(cf.date)}</td>
                      <td style={cellStyle} title={cf.reason}>{cf.reason || '—'}</td>
                      <td style={cellStyle} title={cf.complainer_details}>{cf.complainer_details || '—'}</td>
                      <td style={cellStyle} title={cf.registered_ccu_file_no}>{cf.registered_ccu_file_no || '—'}</td>
                      <td style={cellStyle} title={cf.remarks}>{cf.remarks || '—'}</td>
                      <td style={{ ...cellStyle, overflow: 'visible' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: `${STATUS_COLORS[cf.status] || theme.blue}15`,
                          color: STATUS_COLORS[cf.status] || theme.blue,
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          {cf.status}
                        </span>
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'center', overflow: 'visible' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button onClick={() => { setSelectedRecord(cf); setShowViewModal(true); }}
                            style={{ background: 'none', border: 'none', color: theme.blue, cursor: 'pointer', fontSize: 14, padding: 4 }} title="View">
                            <i className="fas fa-eye" />
                          </button>
                          <button onClick={() => { setSelectedHistoryRecord(cf); setShowHistoryModal(true); }}
                            style={{ background: 'none', border: 'none', color: theme.text2, cursor: 'pointer', fontSize: 14, padding: 4 }} title="History">
                            <i className="fas fa-history" />
                          </button>
                          <button onClick={() => { setEditingRecord(cf); setShowFormModal(true); }}
                            style={{ background: 'none', border: 'none', color: theme.orange, cursor: 'pointer', fontSize: 14, padding: 4 }} title="Edit">
                            <i className="fas fa-edit" />
                          </button>
                          <button onClick={() => handleDeleteRecord(cf.id)}
                            style={{ background: 'none', border: 'none', color: theme.red, cursor: 'pointer', fontSize: 14, padding: 4 }} title="Delete">
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <FormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingRecord(null); }}
        onSave={handleSaveRecord}
        initialData={editingRecord}
      />

      <ViewModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        record={selectedRecord}
        onEdit={(rec) => { setEditingRecord(rec); setShowFormModal(true); }}
        onDelete={handleDeleteRecord}
      />

      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => { setShowHistoryModal(false); setSelectedHistoryRecord(null); }}
        record={selectedHistoryRecord}
        theme={theme}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: toast.type === 'error' ? theme.red : theme.green,
          color: '#fff',
          padding: '12px 18px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,.15)',
          zIndex: 1000,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}