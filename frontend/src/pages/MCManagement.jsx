import { useEffect, useMemo, useState } from 'react';
import {
  fetchMCsFiltered,
  createMC,
  importMCsBulk,
} from '../api';
import { useConfirmDialog } from '../ConfirmDialogContext.jsx';
import '../CMAStyles.css';
import * as XLSX from 'xlsx';
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
  maxWidth: 860,
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
  maxWidth: 0, // required for text-overflow to work inside table-layout:fixed
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
  'REG DATE':       88,
  'OLD FILE NO':    90,
  'NEW FILE NO':    90,
  'NAME':          180,
  'PLAN NO':        72,
  'UNITS':          52,
  'RESIDENTIAL':    82,
  'NON RESIDENTIAL':100,
  'SERVICE UNITS':  88,
  'CATEGORY':       80,
  'SECRETARY':     110,
  'TOWN':           80,
  'REG FORM':      220,
  'STATUS':         84,
  'ACTIONS':        72,
};

function StatusPill({ status }) {
  const s = String(status || '').toLowerCase();
  const isActive = s.includes('active') && !s.includes('non');
  const isNonActive = s.includes('non');
  const bg = isActive ? '#f0fdf4' : isNonActive ? '#fef2f2' : '#eff6ff';
  const color = isActive ? theme.green : isNonActive ? theme.red : theme.blue;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 999, background: bg, color, fontWeight: 700, fontSize: 11 }}>
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
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: theme.text2 }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function CouncilMembersEditor({ value, onChange }) {
  const rows = Array.isArray(value) ? value : [];
  const normalized = Array.from({ length: 12 }, (_, idx) => rows[idx] || { name: '', unit_no: '', contact_no: '' });

  function updateRow(index, field, fieldValue) {
    const next = normalized.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: fieldValue } : row));
    onChange(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: 'span 2' }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Council Members (I–XII)</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {normalized.map((row, index) => (
          <div key={`council-${index}`} style={{ border: `1px solid ${theme.border}`, borderRadius: 8, padding: 8, background: theme.bg }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.navy, marginBottom: 6 }}>{String.fromCharCode(73 + index)}{index > 0 ? '' : ''}</div>
            <input value={row.name || ''} onChange={(e) => updateRow(index, 'name', e.target.value)} placeholder="Name" style={{ ...inputStyle, marginBottom: 6 }} />
            <input value={row.unit_no || ''} onChange={(e) => updateRow(index, 'unit_no', e.target.value)} placeholder="Unit No" style={{ ...inputStyle, marginBottom: 6 }} />
            <input value={row.contact_no || ''} onChange={(e) => updateRow(index, 'contact_no', e.target.value)} placeholder="Contact" style={{ ...inputStyle }} />
          </div>
        ))}
      </div>
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
  return String(k || '').trim().replace(/\s+/g, ' ').toLowerCase();
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

function deriveStatus(v) {
  const s = toText(v).toLowerCase();
  if (!s) return 'Active';
  if (s.includes('non') && s.includes('active')) return 'Non Active';
  if (s.includes('non')) return 'Non Active';
  if (s.includes('pending')) return 'Pending';
  if (s.includes('active')) return 'Active';
  return String(v).trim();
}

function coerceDateText(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const text = String(v).trim();
  const numeric = Number(text);
  if (!Number.isNaN(numeric) && numeric > 1000 && numeric < 100000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(numeric));
    return epoch.toISOString().slice(0, 10);
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return text;
}

function formatDisplayDate(v) {
  const d = coerceDateText(v);
  if (!d) return '—';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return d;
}

function formatBoolean(v) {
  if (v === true || v === 'true' || v === 1 || v === '1') return 'Yes';
  if (v === false || v === 'false' || v === 0 || v === '0') return 'No';
  return '—';
}

function formatCouncilMembers(v) {
  if (!v) return '—';
  if (Array.isArray(v)) {
    return v.filter((row) => row?.name || row?.unit_no || row?.contact_no).map((row, index) => `${String.fromCharCode(73 + index)}. ${row.name || '—'}${row.unit_no ? ` / ${row.unit_no}` : ''}${row.contact_no ? ` / ${row.contact_no}` : ''}`).join(' | ');
  }
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) {
      return parsed.filter((row) => row?.name || row?.unit_no || row?.contact_no).map((row, index) => `${String.fromCharCode(73 + index)}. ${row.name || '—'}${row.unit_no ? ` / ${row.unit_no}` : ''}${row.contact_no ? ` / ${row.contact_no}` : ''}`).join(' | ');
    }
  } catch (e) {
    // fall through to plain text
  }
  return String(v);
}

function getRegistrationSummary(mc) {
  const parts = [];
  if (mc?.non_res_shops || mc?.non_res_office || mc?.non_res_hotel) {
    parts.push(`Non-res: ${mc.non_res_shops || 0}/${mc.non_res_office || 0}/${mc.non_res_hotel || 0}`);
  }
  if (mc?.services_lift || mc?.services_fire_agreement || mc?.services_generator_agreement || mc?.services_insurance) {
    parts.push(`Services: ${[mc.services_lift ? 'Lift' : '', mc.services_fire_agreement ? 'Fire' : '', mc.services_generator_agreement ? 'Gen' : '', mc.services_insurance ? 'Ins' : ''].filter(Boolean).join(',') || '—'}`);
  }
  if (mc?.mgmt_company_controlled) {
    parts.push(`Mgmt: ${mc.mgmt_company_name || mc.mgmt_company_contact || 'Yes'}`);
  }
  if (mc?.secretary_contact || mc?.treasurer_contact) {
    parts.push(`Contacts: ${[mc.secretary_contact, mc.treasurer_contact].filter(Boolean).join(' / ')}`);
  }
  if (mc?.council_members) {
    const count = Array.isArray(mc.council_members) ? mc.council_members.filter(Boolean).length : String(mc.council_members).length > 0 ? 1 : 0;
    parts.push(`Council: ${count}`);
  }
  return parts.join(' • ');
}

const BACKEND_FIELDS = [
  'file_no', 'name', 'address', 'plan_no', 'units', 'residential_units',
  'non_residential_units', 'category', 'year', 'secretary', 'treasurer',
  'agm_date', 'status', 'reg_date', 'old_file_no', 'new_file_no',
  'management_corporation_name', 'residential', 'non_residential', 'service_units',
  'renewal_period', 'next_agm_date', 'renewal_date_vise', 'agm_date_vise',
  'mc', 'engineer', 'ma', 'secretary_unit_no', 'treasurer_unit_no',
  'agm_minutes', 'attendance', 'audited_accounts', 'final_accounts',
  'building_insurance', 'sinking_fund', 'budget_proposal', 'town',
  'municipal_council_pradeshiya_saba', 'certificate_division_file_no',
  'land_registry_approved_date', 'declaration_no', 'email_address',
  'non_res_shops', 'non_res_office', 'non_res_hotel', 'council_members',
  'services_lift', 'services_fire_agreement', 'services_generator_agreement', 'services_insurance',
  'fac_common_parking', 'fac_accessory_car_parcel', 'fac_roof_top', 'fac_gym',
  'fac_swimming_pool', 'fac_penth_house', 'fac_restaurant', 'fac_super_market',
  'fac_garden', 'fac_sauna', 'fac_salon', 'fac_golf_tennis', 'fac_day_care',
  'mgmt_company_controlled', 'mgmt_company_name', 'mgmt_company_contact',
  'secretary_contact', 'secretary_email', 'treasurer_contact', 'treasurer_email',
  'written_assurance_fulfilled',
];

function toBackendRecordFromExcelRow(row) {
  const file_no_new = toText(getCell(row, 'New File No.', 'New File No', 'New_File_No', 'new_file_no'));
  const file_no_old = toText(getCell(row, 'Old File No.', 'Old File No', 'Old_File_No', 'old_file_no'));
  const file_no = file_no_new || file_no_old || toText(getCell(row, 'file_no', 'File No'));

  const name = toText(getCell(row, 'Name of Management Corporation - New', 'Management_Corporation_name', 'management_corporation_name', 'Management Corporation Name', 'Name'));
  const address = toText(getCell(row, 'Address', 'address'));
  const plan_no = toText(getCell(row, 'Plan No', 'plan_no'));
  const units = toIntOrNull(getCell(row, 'Units', 'units'));
  const residential_units = toIntOrNull(getCell(row, 'Residential', 'residential'));
  const non_residential_units = toIntOrNull(getCell(row, 'Non Residencial', 'Non Residential', 'non_residential', 'non_residential_units'));
  const service_units = toIntOrNull(getCell(row, 'Service_Units', 'Service Units', 'service_units'));
  const category = toText(getCell(row, 'Catogory', 'Category', 'category'));
  const renewal_period = toText(getCell(row, 'Renewal_Period', 'Renewal Period', 'renewal_period'));
  const reg_date_raw = getCell(row, 'Reg_Date', 'Reg. Date', 'reg_date');
  const reg_date = coerceDateText(reg_date_raw);
  const status = deriveStatus(renewal_period || getCell(row, 'Renewal Period', 'renewal_period', 'status'));
  const year = deriveYear(getCell(row, 'Reg. Date', 'Reg_Date', 'reg_date', 'Year'));
  const secretary = toText(getCell(row, 'Secretary', 'secretary'));
  const secretary_unit_no = toText(getCell(row, 'Secretary_Unit_No', 'Secretary unit No.', 'Secretary Unit No.', 'secretary_unit_no'));
  const treasurer = toText(getCell(row, 'Treasurer', 'treasurer'));
  const treasurer_unit_no = toText(getCell(row, 'Treasurer_Unit_No', 'Treasurer unit No.', 'unit No', 'treasurer_unit_no'));
  const agm_date = coerceDateText(getCell(row, 'AGM Date', 'agm_date'));
  const next_agm_date = coerceDateText(getCell(row, 'Next_AGM_Date', 'Next AGM Date', 'next_agm_date'));
  const renewal_date_vise = coerceDateText(getCell(row, 'Renewal_Date_Vise', 'Renewal Date Vise', 'renewal_date_vise'));
  const agm_date_vise = coerceDateText(getCell(row, 'AGM_Date_Vise', 'AGM Date Vise', 'agm_date_vise'));
  const mc = toText(getCell(row, 'MC', 'mc'));
  const engineer = toText(getCell(row, 'Eng.', 'Engineer', 'engineer'));
  const ma = toText(getCell(row, 'MA', 'ma'));
  const agm_minutes = toText(getCell(row, 'AGM_Minutes', 'AGM Minutes', 'agm_minutes'));
  const attendance = toText(getCell(row, 'Attendance', 'Attendence', 'attendance'));
  const audited_accounts = toText(getCell(row, 'Audited_Accounts', 'Audited Account', 'Audited Account', 'audited_accounts'));
  const final_accounts = toText(getCell(row, 'Final_Accounts', 'Final Acconts', 'Final Accounts', 'final_accounts'));
  const building_insurance = toText(getCell(row, 'Building_Insurance', 'Building Insuarance', 'Building Insurance', 'building_insurance'));
  const sinking_fund = toText(getCell(row, 'Sinking_Fund', 'Sinking Fund', 'sinking_fund'));
  const budget_proposal = toText(getCell(row, 'Budget_Proposal', 'Budjet Propsal', 'Budget Proposal', 'budget_proposal'));
  const town = toText(getCell(row, 'Town', 'town'));
  const municipal_council_pradeshiya_saba = toText(getCell(row, 'Municipal_Council_Pradeshiya_Saba', 'Municipal Council /Pradeshiya Saba limits', 'municipal_council_pradeshiya_saba'));
  const certificate_division_file_no = toText(getCell(row, 'Certificate_Division_File_No', 'Certificate Division File No.', 'certificate_division_file_no'));
  const land_registry_approved_date = coerceDateText(getCell(row, 'Land_Registry_Approved_Date', 'Land registry Approved Date', 'land_registry_approved_date'));
  const declaration_no = toText(getCell(row, 'Declaration_No', 'Declaration No.', 'declaration_no'));
  const email_address = toText(getCell(row, 'Email_Address', 'Email Address', 'email_address'));

  const rec = {
    file_no, name, address, plan_no, units, residential_units, non_residential_units,
    residential: residential_units, non_residential: non_residential_units,
    service_units, category, year, secretary, treasurer, secretary_unit_no,
    treasurer_unit_no, agm_date, next_agm_date, renewal_period, renewal_date_vise,
    agm_date_vise, mc, engineer, ma, agm_minutes, attendance, audited_accounts,
    final_accounts, building_insurance, sinking_fund, budget_proposal, town,
    municipal_council_pradeshiya_saba, certificate_division_file_no,
    land_registry_approved_date, declaration_no, email_address, reg_date,
    old_file_no: file_no_old, new_file_no: file_no_new,
    management_corporation_name: name, status,
  };

  for (const k of BACKEND_FIELDS) {
    if (!(k in rec)) rec[k] = null;
  }

  return rec;
}

function blankForm() {
  return {
    reg_date: '', old_file_no: '', new_file_no: '', file_no: '',
    management_corporation_name: '', name: '', address: '',
    plan_no: '', declaration_no: '', email_address: '',
    units: '', residential_units: '', non_residential_units: '', service_units: '',
    category: '', year: '', town: '', municipal_council_pradeshiya_saba: '',
    certificate_division_file_no: '', land_registry_approved_date: '',
    secretary: '', secretary_unit_no: '', treasurer: '', treasurer_unit_no: '',
    mc: '', engineer: '', ma: '',
    agm_date: '', next_agm_date: '', renewal_period: '',
    renewal_date_vise: '', agm_date_vise: '',
    agm_minutes: '', attendance: '', audited_accounts: '', final_accounts: '',
    building_insurance: '', sinking_fund: '', budget_proposal: '',
    non_res_shops: '', non_res_office: '', non_res_hotel: '',
    services_lift: false, services_fire_agreement: false, services_generator_agreement: false, services_insurance: false,
    fac_common_parking: false, fac_accessory_car_parcel: false, fac_roof_top: false, fac_gym: false,
    fac_swimming_pool: false, fac_penth_house: false, fac_restaurant: false, fac_super_market: false,
    fac_garden: false, fac_sauna: false, fac_salon: false, fac_golf_tennis: false, fac_day_care: false,
    mgmt_company_controlled: false, mgmt_company_name: '', mgmt_company_contact: '',
    secretary_contact: '', secretary_email: '', treasurer_contact: '', treasurer_email: '',
    council_members: Array.from({ length: 12 }, () => ({ name: '', unit_no: '', contact_no: '' })),
    written_assurance_fulfilled: false,
    status: 'Active',
  };
}

const TABLE_HEADERS = [
  'REG DATE', 'OLD FILE NO', 'NEW FILE NO', 'NAME', 'PLAN NO',
  'UNITS', 'RESIDENTIAL', 'NON RESIDENTIAL', 'SERVICE UNITS',
  'CATEGORY', 'SECRETARY', 'TOWN', 'REG FORM', 'STATUS', 'ACTIONS',
];

// ─── Approval Checklist Modal ────────────────────────────────────────────────
// Mirrors the printed "Customer Care Unit — Document Check List for Management
// Corporation" form exactly: every box that is a tick-box on the paper form is
// a checkbox here, and every blank/underline on the paper form (no., date,
// page count, etc.) is its own fillable text field — same items, same order.
const CHECKLIST_ITEMS = [
  { key: 'cl_reg_condo_plan',       type: 'check', label: '01. Registered Condominium Plan No.' },

  { key: 'cl_parcels_total',        type: 'field', label: 'Total', group: '02. Number of Parcels in the Condominium' },
  { key: 'cl_parcels_residential',  type: 'field', label: 'Residential', group: '02. Number of Parcels in the Condominium' },
  { key: 'cl_parcels_office',       type: 'field', label: 'Non Residential — Office', group: '02. Number of Parcels in the Condominium' },
  { key: 'cl_parcels_shops',        type: 'field', label: 'Non Residential — Shops', group: '02. Number of Parcels in the Condominium' },
  { key: 'cl_parcels_hotels',       type: 'field', label: 'Non Residential — Hotels', group: '02. Number of Parcels in the Condominium' },
  { key: 'cl_parcels_service',      type: 'field', label: 'Non Residential — Service Units', group: '02. Number of Parcels in the Condominium' },

  { key: 'cl_services_facilities',  type: 'checkpage', label: '03. Services / Facilites (Attached details)' },
  { key: 'cl_written_assurance',    type: 'checkpage', label: '04. Written assurance from Secretary that C.M.A. requirements will be fulfilled (Attached)' },

  { key: 'cl_photocopy_condo_plan',      type: 'checkpage', label: '01. Registered Condominium Plan issued by the Registered General', group: 'PHOTOCOPY OF' },
  { key: 'cl_photocopy_condo_plan_date', type: 'field', label: 'Date', group: 'PHOTOCOPY OF', placeholder: '.... / .... / ....' },

  { key: 'cl_cma_certificate',      type: 'checkpage', label: '02. CMA Certificate No.', group: 'PHOTOCOPY OF' },
  { key: 'cl_cma_certificate_no',   type: 'field', label: 'CMA / CD / CP / No.', group: 'PHOTOCOPY OF', placeholder: 'CMA/CD/CP/.../...' },
  { key: 'cl_cma_certificate_date', type: 'field', label: 'Date', group: 'PHOTOCOPY OF', placeholder: '.... / .... / ....' },

  { key: 'cl_declaration',          type: 'checkpage', label: '03. Declaration No.', group: 'PHOTOCOPY OF' },
  { key: 'cl_declaration_no',       type: 'field', label: 'Declaration No.', group: 'PHOTOCOPY OF' },
  { key: 'cl_declaration_date',     type: 'field', label: 'Date', group: 'PHOTOCOPY OF', placeholder: '.... / .... / ....' },

  { key: 'cl_agm_minutes',          type: 'checkpage', label: '04. Minutes of the 1st Annual General Meeting', group: 'PHOTOCOPY OF' },
  { key: 'cl_agm_minutes_date',     type: 'field', label: 'Date', group: 'PHOTOCOPY OF', placeholder: '.... / .... / ....' },

  { key: 'cl_attendance',            type: 'checkpage', label: '05. Attendance', group: 'PHOTOCOPY OF' },
  { key: 'cl_attendance_total',      type: 'field', label: 'Total', group: 'PHOTOCOPY OF' },
  { key: 'cl_attendance_physically', type: 'field', label: 'Physically', group: 'PHOTOCOPY OF' },
  { key: 'cl_attendance_proxy',      type: 'field', label: 'Proxy', group: 'PHOTOCOPY OF' },

  { key: 'cl_insurance',      type: 'checkpage', label: '06. Insurance Policy', group: 'PHOTOCOPY OF' },
  { key: 'cl_insurance_from', type: 'field', label: 'Valid Year From', group: 'PHOTOCOPY OF', placeholder: 'From' },
  { key: 'cl_insurance_to',   type: 'field', label: 'To', group: 'PHOTOCOPY OF', placeholder: 'To' },

  { key: 'cl_owners_list',       type: 'checkpage', label: '07. Update List of names of Registered Owners & Address with their sign', group: 'PHOTOCOPY OF' },
  { key: 'cl_constitution',      type: 'checkpage', label: '08. Constitution', group: 'PHOTOCOPY OF' },
  { key: 'cl_bylaws',            type: 'checkpage', label: '09. By Laws', group: 'PHOTOCOPY OF' },
  { key: 'cl_additional_bylaws', type: 'checkpage', label: '10. Additional by Laws (Housing Rules / Code of Conduct / Rules & Regulations)', group: 'PHOTOCOPY OF' },

  { key: 'cl_checked_by',   type: 'field', label: 'Checked by' },
  { key: 'cl_checked_date', type: 'field', label: 'Date', placeholder: '.... / .... / ....' },
];

// Only items with an actual tick-box on the printed form count toward
// the "documents verified" progress. ("checkpage" items have BOTH a
// tick-box AND a page-count blank on the paper form.)
const TICKABLE_ITEMS = CHECKLIST_ITEMS.filter(({ type }) => type === 'check' || type === 'checkpage');
const PAGE_COUNT_ITEMS = CHECKLIST_ITEMS.filter(({ type }) => type === 'checkpage');
const FIELD_ITEMS = CHECKLIST_ITEMS.filter(({ type }) => type === 'field');

const blankChecklist = () => ({
  ...Object.fromEntries(TICKABLE_ITEMS.map(({ key }) => [key, false])),
  ...Object.fromEntries(FIELD_ITEMS.map(({ key }) => [key, ''])),
  ...Object.fromEntries(PAGE_COUNT_ITEMS.map(({ key }) => [`${key}_pg`, ''])),
});

function ApprovalChecklistModal({ record, onClose, onSave, onApprove, onReject }) {
  const [checks, setChecks] = useState(() => {
    const base = blankChecklist();
    // Pre-fill any already-saved checklist values from the record
    Object.keys(base).forEach((key) => {
      if (record[key] !== undefined && record[key] !== null) base[key] = record[key];
    });
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(record.approval_note || '');

  const allChecked = TICKABLE_ITEMS.every(({ key }) => checks[key]);
  const checkedCount = TICKABLE_ITEMS.filter(({ key }) => checks[key]).length;

  function toggle(key) {
    setChecks((p) => ({ ...p, [key]: !p[key] }));
  }

  function setField(key, value) {
    setChecks((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ ...checks, approval_note: note });
    setSaving(false);
  }

  async function handleApprove() {
    if (!allChecked) return;
    setSaving(true);
    await onApprove({ ...checks, approval_note: note });
    setSaving(false);
  }

  async function handleReject() {
    setSaving(true);
    await onReject({ ...checks, approval_note: note });
    setSaving(false);
  }

  const overlayBg = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,.55)',
    zIndex: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  };

  return (
    <div style={overlayBg} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, boxShadow: '0 20px 60px rgba(0,0,0,.25)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Document Check List</div>
            <div style={{ fontSize: 12, color: theme.text3, marginTop: 3 }}>Customer Care Unit — Management Corporation Verification</div>
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: theme.navy }}>
              {record.management_corporation_name || record.name}
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 400, color: theme.text3 }}>{record.new_file_no || record.file_no}</span>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '10px 22px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.text2, marginBottom: 4 }}>
            <span>Documents Verified</span>
            <span style={{ fontWeight: 700, color: allChecked ? theme.green : theme.navy }}>{checkedCount} / {TICKABLE_ITEMS.length}</span>
          </div>
          <div style={{ background: theme.border, borderRadius: 99, height: 6, overflow: 'hidden' }}>
            <div style={{ width: `${(checkedCount / TICKABLE_ITEMS.length) * 100}%`, background: allChecked ? theme.green : theme.navy, height: '100%', borderRadius: 99, transition: 'width .3s' }} />
          </div>
        </div>

        {/* Checklist body — laid out exactly as the printed form */}
        <div style={{ padding: '14px 22px', overflowY: 'auto', flex: 1 }}>
          {/* Info row */}
          <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: theme.navy }}>
            <strong>Registered Condominium Plan No:</strong> {record.plan_no || '—'}
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Total Parcels:</strong> {record.units || '—'}
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Residential:</strong> {record.residential ?? record.residential_units ?? '—'}
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Non-Res:</strong> {record.non_residential ?? record.non_residential_units ?? '—'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(() => {
              let lastGroup = null;
              return CHECKLIST_ITEMS.map((item) => {
                const { key, type, label, group, placeholder } = item;
                const groupHeader = group && group !== lastGroup;
                lastGroup = group || lastGroup;

                const rowStart = (
                  <>
                    {groupHeader && (
                      <div
                        key={`group-${group}`}
                        style={{
                          fontSize: 11, fontWeight: 700, color: theme.navy, textTransform: 'uppercase',
                          letterSpacing: '0.6px', marginTop: 10, paddingBottom: 4, borderBottom: `1px dashed ${theme.border}`,
                        }}
                      >
                        {group}
                      </div>
                    )}
                  </>
                );

                // ── Plain tick-box item (no page-count blank): e.g. item 01 ──
                if (type === 'check') {
                  return (
                    <div key={key}>
                      {rowStart}
                      <label
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                          borderRadius: 8, cursor: 'pointer', transition: 'background .15s',
                          background: checks[key] ? '#f0fdf4' : '#fafafa',
                          border: `1px solid ${checks[key] ? '#bbf7d0' : theme.border}`,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checks[key]}
                          onChange={() => toggle(key)}
                          style={{ width: 15, height: 15, accentColor: theme.green, cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span style={{ flex: 1, fontSize: 13, color: theme.text, fontWeight: checks[key] ? 500 : 400 }}>{label}</span>
                        {checks[key] && <i className="fas fa-check-circle" style={{ color: theme.green, fontSize: 13, flexShrink: 0 }} />}
                      </label>
                    </div>
                  );
                }

                // ── Tick-box item that also has a page-count box ("pg.") ──
                if (type === 'checkpage') {
                  return (
                    <div key={key}>
                      {rowStart}
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                          borderRadius: 8, transition: 'background .15s',
                          background: checks[key] ? '#f0fdf4' : '#fafafa',
                          border: `1px solid ${checks[key] ? '#bbf7d0' : theme.border}`,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checks[key]}
                          onChange={() => toggle(key)}
                          style={{ width: 15, height: 15, accentColor: theme.green, cursor: 'pointer', flexShrink: 0 }}
                        />
                        <label
                          onClick={() => toggle(key)}
                          style={{ flex: 1, fontSize: 13, color: theme.text, fontWeight: checks[key] ? 500 : 400, cursor: 'pointer' }}
                        >
                          {label}
                        </label>
                        <span style={{ fontSize: 11, color: theme.text3, flexShrink: 0 }}>pg.</span>
                        <input
                          type="text"
                          value={checks[`${key}_pg`] || ''}
                          onChange={(e) => setField(`${key}_pg`, e.target.value)}
                          placeholder="—"
                          style={{ ...inputStyle, width: 52, padding: '5px 7px', fontSize: 12, flexShrink: 0 }}
                          onFocus={(e) => e.stopPropagation()}
                        />
                        {checks[key] && <i className="fas fa-check-circle" style={{ color: theme.green, fontSize: 13, flexShrink: 0 }} />}
                      </div>
                    </div>
                  );
                }

                // ── Fillable field (the blanks / underlines on the paper form) ──
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px 4px 36px' }}>
                    <span style={{ fontSize: 12, color: theme.text2, minWidth: 150, flexShrink: 0 }}>{label}</span>
                    <input
                      type="text"
                      value={checks[key] || ''}
                      onChange={(e) => setField(key, e.target.value)}
                      placeholder={placeholder || ''}
                      style={{ ...inputStyle, padding: '6px 9px', fontSize: 12.5 }}
                    />
                  </div>
                );
              });
            })()}
          </div>

          {/* Notes */}
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2, display: 'block', marginBottom: 4 }}>Remarks</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add remarks…"
              style={{ ...inputStyle, resize: 'vertical', minHeight: 54 }}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '12px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={onClose} style={btnOutline} disabled={saving}>Cancel</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} style={btnOutline} disabled={saving}>
              <i className="fas fa-save" /> {saving ? 'Saving…' : 'Save Progress'}
            </button>
            <button
              onClick={handleReject}
              disabled={saving}
              style={{ ...btnBase, background: '#fef2f2', color: theme.red, border: `1px solid #fecaca` }}
            >
              <i className="fas fa-times-circle" /> Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={saving || !allChecked}
              title={!allChecked ? 'All documents must be checked before approving' : ''}
              style={{ ...btnBase, background: allChecked ? theme.green : '#d1fae5', color: '#fff', cursor: allChecked ? 'pointer' : 'not-allowed', opacity: allChecked ? 1 : 0.6 }}
            >
              <i className="fas fa-check-circle" /> Approve & Activate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function MCManagementBackend({ currentUser }) {
  const auditUserLabel = currentUser?.name && currentUser?.username
    ? `${currentUser.name} (${currentUser.username})`
    : currentUser?.name || currentUser?.username || '';

  const [mcs, setMcs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const filter = localStorage.getItem('cma_mc_filter');
    if (filter) {
      localStorage.removeItem('cma_mc_filter');
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
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [checklistRecord, setChecklistRecord] = useState(null);
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
    const active = mcs.filter((r) => r.status === 'Active').length;
    const inactive = mcs.filter((r) => r.status === 'Non Active').length;
    const pending = mcs.filter((r) => r.status === 'Pending').length;
    return { total, active, inactive, pending };
  }, [mcs, totalCount]);

  const filtered = mcs || [];

  async function load() {
    setLoading(true);
    try {
      const data = await fetchMCsFiltered({
        year: yearFilter || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        q: searchTerm || undefined,
        page: viewAll ? 1 : page,
        limit: pageSize,
      });
      setMcs(data?.rows ?? []);
      setTotalCount(data?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setPage(1); }, [statusFilter, yearFilter, categoryFilter, searchTerm, viewAll]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, yearFilter, categoryFilter, searchTerm, page]);

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
      if (mc[k] !== undefined) {
        if (k === 'council_members') {
          try {
            const parsed = typeof mc[k] === 'string' ? JSON.parse(mc[k]) : mc[k];
            f[k] = Array.isArray(parsed) ? parsed : Array.from({ length: 12 }, () => ({ name: '', unit_no: '', contact_no: '' }));
          } catch (e) {
            f[k] = Array.from({ length: 12 }, () => ({ name: '', unit_no: '', contact_no: '' }));
          }
        } else {
          f[k] = mc[k] ?? '';
        }
      }
    });
    setFormData(f);
    setModalOpen(true);
  }

  function openView(mc) {
    setViewRecord(mc);
    setViewModalOpen(true);
  }

  async function save() {
    const file_no = toText(formData.new_file_no || formData.old_file_no || formData.file_no);
    const name = toText(formData.management_corporation_name || formData.name);
    if (!file_no) return showToast('File number is required', 'error');
    if (!name) return showToast('Name is required', 'error');

    const payload = {
      ...formData,
      file_no,
      name,
      management_corporation_name: name,
      old_file_no: toText(formData.old_file_no),
      new_file_no: toText(formData.new_file_no),
      units: toIntOrNull(formData.units),
      residential_units: toIntOrNull(formData.residential_units),
      non_residential_units: toIntOrNull(formData.non_residential_units),
      residential: toIntOrNull(formData.residential_units),
      non_residential: toIntOrNull(formData.non_residential_units),
      service_units: toIntOrNull(formData.service_units),
      non_res_shops: toIntOrNull(formData.non_res_shops),
      non_res_office: toIntOrNull(formData.non_res_office),
      non_res_hotel: toIntOrNull(formData.non_res_hotel),
      council_members: JSON.stringify((formData.council_members || []).filter((row) => row?.name || row?.unit_no || row?.contact_no)),
      year: formData.year === '' ? null : deriveYear(formData.year),
      status: formData.status || 'Active',
      ...(auditUserLabel ? { created_by: auditUserLabel, modified_by: auditUserLabel } : {}),
    };

    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      if (editingId) {
        const r = await fetch(`${API_BASE}/mc/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || 'Update failed');
        showToast('MC updated ✅');
      } else {
        await createMC(payload);
        showToast('MC created ✅');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    }
  }

  async function remove(id) {
    const confirmed = await confirm({
      title: 'Delete MC record',
      message: 'Delete this MC record? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const r = await fetch(`${API_BASE}/mc/${id}`, { method: 'DELETE' });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Delete failed');
      showToast('Record deleted', 'error');
      load();
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error');
    }
  }

  function openChecklist(mc) {
    // Ensure checklist-related fields always exist so modal shows correctly
    const checklistDefaults = {
      approval_note: '',
      cl_reg_condo_plan: false,
      cl_parcels_total: '',
      cl_parcels_residential: '',
      cl_parcels_office: '',
      cl_parcels_shops: '',
      cl_parcels_hotels: '',
      cl_parcels_service: '',
      cl_services_facilities: false,
      cl_written_assurance: false,
      cl_photocopy_condo_plan: false,
      cl_photocopy_condo_plan_date: '',
      cl_cma_certificate: false,
      cl_cma_certificate_no: '',
      cl_cma_certificate_date: '',
      cl_declaration: false,
      cl_declaration_no: '',
      cl_declaration_date: '',
      cl_agm_minutes: false,
      cl_agm_minutes_date: '',
      cl_attendance: false,
      cl_attendance_total: '',
      cl_attendance_physically: '',
      cl_attendance_proxy: '',
      cl_insurance: false,
      cl_insurance_from: '',
      cl_insurance_to: '',
      cl_owners_list: false,
      cl_constitution: false,
      cl_bylaws: false,
      cl_additional_bylaws: false,
      cl_checked_by: '',
      cl_checked_date: '',

      cl_parcels_total_pg: '',
      cl_parcels_residential_pg: '',
      cl_parcels_office_pg: '',
      cl_parcels_shops_pg: '',
      cl_parcels_hotels_pg: '',
      cl_parcels_service_pg: '',
      cl_services_facilities_pg: '',
      cl_written_assurance_pg: '',
      cl_photocopy_condo_plan_pg: '',
      cl_cma_certificate_pg: '',
      cl_declaration_pg: '',
      cl_agm_minutes_pg: '',
      cl_attendance_pg: '',
      cl_insurance_pg: '',
      cl_owners_list_pg: '',
      cl_constitution_pg: '',
      cl_bylaws_pg: '',
      cl_additional_bylaws_pg: '',
    };

    setChecklistRecord({ ...checklistDefaults, ...mc });
    setChecklistModalOpen(true);
  }

  async function patchMC(id, payload) {
    const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
    const r = await fetch(`${API_BASE}/mc/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || 'Update failed');
    return body;
  }

  async function handleChecklistSave(checkData) {
    try {
      await patchMC(checklistRecord.id, checkData);
      showToast('Checklist progress saved ✅');
      load();
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    }
  }

  async function handleChecklistApprove(checkData) {
    try {
      // Normalize boolean-like values before save
      const normalized = { ...checkData };
      Object.keys(normalized).forEach((k) => {
        if (k.startsWith('cl_') && typeof normalized[k] !== 'boolean') {
          const v = normalized[k];
          normalized[k] = v === true || v === 'true' || v === 1 || v === '1';
        }
      });
      await patchMC(checklistRecord.id, { ...normalized, status: 'Active' });
      showToast('MC Approved & set to Active ✅');
      setChecklistModalOpen(false);
      load();
    } catch (e) {
      showToast(e.message || 'Approve failed', 'error');
    }
  }

  async function handleChecklistReject(checkData) {
    try {
      await patchMC(checklistRecord.id, { ...checkData, status: 'Non Active' });
      showToast('MC Rejected & set to Non Active', 'error');
      setChecklistModalOpen(false);
      load();
    } catch (e) {
      showToast(e.message || 'Reject failed', 'error');
    }
  }

  async function exportExcel() {
    try {
      if (typeof window.XLSX === 'undefined') return showToast('XLSX library not loaded', 'error');
      showToast('Exporting all MC Records...');
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/mc?limit=999999`);
      const result = await response.json();
      const allRecords = result.rows || result || [];
      const rows = (allRecords || []).map((r) => ({
        'File_No': r.file_no ?? '',
        'Reg_Date': r.reg_date ?? '',
        'Old_File_No': r.old_file_no ?? '',
        'New_File_No': r.new_file_no ?? '',
        'Management_Corporation_Name': r.management_corporation_name ?? r.name ?? '',
        'Address': r.address ?? '',
        'Plan_No': r.plan_no ?? '',
        'Units': r.units ?? '',
        'Residential': r.residential ?? r.residential_units ?? '',
        'Non_Residential': r.non_residential ?? r.non_residential_units ?? '',
        'Service_Units': r.service_units ?? '',
        'Category': r.category ?? '',
        'Year': r.year ?? '',
        'Status': r.status ?? '',
        'Renewal_Period': r.renewal_period ?? '',
        'AGM_Date': r.agm_date ?? '',
        'Next_AGM_Date': r.next_agm_date ?? '',
        'Renewal_Date_Vise': r.renewal_date_vise ?? '',
        'AGM_Date_Vise': r.agm_date_vise ?? '',
        'MC': r.mc ?? '',
        'Engineer': r.engineer ?? '',
        'MA': r.ma ?? '',
        'Secretary': r.secretary ?? '',
        'Secretary_Unit_No': r.secretary_unit_no ?? '',
        'Treasurer': r.treasurer ?? '',
        'Treasurer_Unit_No': r.treasurer_unit_no ?? '',
        'AGM_Minutes': r.agm_minutes ?? '',
        'Attendance': r.attendance ?? '',
        'Audited_Accounts': r.audited_accounts ?? '',
        'Final_Accounts': r.final_accounts ?? '',
        'Building_Insurance': r.building_insurance ?? '',
        'Sinking_Fund': r.sinking_fund ?? '',
        'Budget_Proposal': r.budget_proposal ?? '',
        'Town': r.town ?? '',
        'Municipal_Council_Pradeshiya_Saba': r.municipal_council_pradeshiya_saba ?? '',
        'Certificate_Division_File_No': r.certificate_division_file_no ?? '',
        'Land_Registry_Approved_Date': r.land_registry_approved_date ?? '',
        'Declaration_No': r.declaration_no ?? '',
        'Email_Address': r.email_address ?? '',
        'Created_By': r.created_by ?? '',
        'Modified_By': r.modified_by ?? '',
        'Created_At': r.created_at ?? '',
        'Updated_At': r.updated_at ?? '',
      }));
      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'MC Records');
      window.XLSX.writeFile(wb, `CMA_MC_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      const wb = window.XLSX.read(new Uint8Array(data), { type: 'array' });
      let allRows = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = window.XLSX.utils.sheet_to_json(ws, { defval: '' });
        allRows.push(...rows);
      }
      if (!allRows.length) return showToast('No data found in any sheet', 'error');
      const records = allRows
        .map(toBackendRecordFromExcelRow)
        .filter((r) => toText(r.file_no) && toText(r.management_corporation_name))
        .map((record) => ({
          ...record,
          ...(auditUserLabel ? { created_by: auditUserLabel, modified_by: auditUserLabel } : {}),
        }));
      if (!records.length) return showToast('No valid records found (missing file_no or management_corporation_name)', 'error');
      await importMCsBulk(records);
      showToast(`Imported ${records.length} records ✅`);
      setLastImportedFileNos(records.map((x) => x.file_no).filter(Boolean));
      load();
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      e.target.value = '';
    }
  }

  async function handleDeleteAll() {
    const confirmed = await confirm({
      title: 'Delete all MC records',
      message: 'Delete ALL MC records? This cannot be undone.',
      confirmLabel: 'Delete all',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const r = await fetch(`${API_BASE}/mc`, { method: 'DELETE' });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || 'Delete all failed');
      showToast(`Deleted all MC records ✅`);
      setLastImportedFileNos([]);
      load();
    } catch (err) {
      showToast(err.message || 'Delete all failed', 'error');
    }
  }

  async function handleDeleteImported() {
    if (!lastImportedFileNos || !lastImportedFileNos.length) return showToast('No imported batch to delete', 'error');
    const confirmed = await confirm({
      title: 'Delete imported MC records',
      message: `Delete ${lastImportedFileNos.length} imported records? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const r = await fetch(`${API_BASE}/mc/bulk-delete`, {
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

  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div style={{ padding: 24, fontFamily: "'DM Sans', sans-serif", background: theme.bg, minHeight: '100vh' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
        <span>Home</span> / <span>MC Management</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: theme.text }}>MC Management</h2>
          <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0 0' }}>Management Corporation records</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={exportExcel} style={btnOutline}><i className="fas fa-download" /> Export</button>
          <label style={{ ...btnOutline, cursor: 'pointer', margin: 0 }}>
            <i className="fas fa-upload" /> Import
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={importExcel} />
          </label>
          <button onClick={handleDeleteAll} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete all MCs">
            <i className="fas fa-trash" /> Delete All
          </button>
          {lastImportedFileNos && lastImportedFileNos.length > 0 && (
            <button onClick={handleDeleteImported} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete imported batch">
              <i className="fas fa-trash" /> Delete Imported
            </button>
          )}
          <button onClick={openAdd} style={btnPrimary}><i className="fas fa-plus" /> Add MC</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'TOTAL MC', value: stats.total, icon: 'fa-folder-open', color: theme.blue },
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

      {/* Table Card */}
      <div style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', overflow: 'hidden' }}>

        {/* Filters */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>All MC Records</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search MC…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 160 }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12, minWidth: 120 }}
            >
              <option value="">All Status</option>
              <option>Active</option>
              <option>Non Active</option>
              <option>Pending</option>
            </select>
            <input
              type="number"
              placeholder="Year"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 90 }}
            />
            <input
              type="text"
              placeholder="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 110 }}
            />
            <button
              onClick={() => setViewAll(v => !v)}
              style={viewAll ? { ...btnPrimary, padding: '6px 12px', fontSize: 12 } : { ...btnOutline, padding: '6px 12px', fontSize: 12 }}
              title="Load up to 1000 rows"
            >
              {viewAll ? 'View Paging' : 'View All (1000)'}
            </button>
          </div>
        </div>

        {/* Pagination */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: theme.text2 }}>
            Showing <strong>{loading ? 0 : filtered.length}</strong> of <strong>{totalCount}</strong>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {!viewAll && (
              <>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={page === 1 ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed', padding: '5px 10px', fontSize: 12 } : { ...btnOutline, padding: '5px 10px', fontSize: 12 }}
                >Prev</button>
                <span style={{ fontSize: 12, color: theme.text3 }}>Page <strong style={{ color: theme.text }}>{page}</strong> / {maxPage}</span>
                <button
                  onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                  disabled={page >= maxPage}
                  style={page >= maxPage ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed', padding: '5px 10px', fontSize: 12 } : { ...btnOutline, padding: '5px 10px', fontSize: 12 }}
                >Next</button>
              </>
            )}
            {viewAll && (
              <span style={{ fontSize: 12, color: theme.text3 }}><strong style={{ color: theme.text }}>All (up to 1000)</strong></span>
            )}
          </div>
        </div>

        {/* Table — fixed layout so column widths are respected */}
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
                <tr><td colSpan={TABLE_HEADERS.length} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>No MC records found</td></tr>
              ) : (
                filtered.map((mc) => (
                  <tr key={mc.id} style={{ borderBottom: `1px solid ${theme.border}` }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  >
                    <td style={cellStyle} title={formatDisplayDate(mc.reg_date)}>{formatDisplayDate(mc.reg_date)}</td>
                    <td style={cellStyle} title={mc.old_file_no || '—'}>{mc.old_file_no || '—'}</td>
                    <td style={cellStyle} title={mc.new_file_no || '—'}>{mc.new_file_no || '—'}</td>
                    <td style={cellStyle} title={mc.management_corporation_name || mc.name}>{mc.management_corporation_name || mc.name}</td>
                    <td style={cellStyle} title={mc.plan_no || '—'}>{mc.plan_no || '—'}</td>
                    <td style={cellStyle}>{mc.units ?? '—'}</td>
                    <td style={cellStyle}>{mc.residential ?? mc.residential_units ?? '—'}</td>
                    <td style={cellStyle}>{mc.non_residential ?? mc.non_residential_units ?? '—'}</td>
                    <td style={cellStyle}>{mc.service_units ?? '—'}</td>
                    <td style={cellStyle} title={mc.category || '—'}>{mc.category || '—'}</td>
                    <td style={cellStyle} title={mc.secretary || '—'}>{mc.secretary || '—'}</td>
                    <td style={cellStyle} title={mc.town || '—'}>{mc.town || '—'}</td>
                    <td style={cellStyle} title={getRegistrationSummary(mc)}>{getRegistrationSummary(mc) || '—'}</td>
                    <td style={{ ...cellStyle, overflow: 'visible' }}><StatusPill status={mc.status} /></td>
                    <td style={{ ...cellStyle, overflow: 'visible' }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <ActionBtn icon="fas fa-eye" color="#0066cc" title="View" onClick={() => openView(mc)} />
                        <ActionBtn icon="fas fa-history" color="#6b7280" title="History" onClick={() => { setSelectedHistoryRecord(mc); setShowHistoryModal(true); }} />
                        {String(mc.status || '').trim().toLowerCase() === 'pending' && (
                          <ActionBtn icon="fas fa-clipboard-check" color="#7c3aed" title="Verify Documents" onClick={() => openChecklist({ ...mc, status: 'Pending' })} />
                        )}
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

      {/* Add / Edit Modal — unchanged */}
      {modalOpen && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div style={modalStyle}>
            <div style={modalHeader}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{editingId ? 'Edit MC Record' : 'Add MC Record'}</span>
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
              <FormField label="Declaration No" value={formData.declaration_no} onChange={field('declaration_no')} />
              <FormField label="Email Address" type="email" value={formData.email_address} onChange={field('email_address')} />

              <SectionLabel>Units</SectionLabel>
              <FormField label="Total Units" type="number" value={formData.units} onChange={field('units')} />
              <FormField label="Residential Units" type="number" value={formData.residential_units} onChange={field('residential_units')} />
              <FormField label="Non Residential Units" type="number" value={formData.non_residential_units} onChange={field('non_residential_units')} />
              <FormField label="Service Units" type="number" value={formData.service_units} onChange={field('service_units')} />

              <SectionLabel>Classification &amp; Location</SectionLabel>
              <FormField label="Category" value={formData.category} onChange={field('category')} />
              <FormField label="Year" type="number" value={formData.year} onChange={field('year')} />
              <FormField label="Town" value={formData.town} onChange={field('town')} />
              <FormField label="Municipal Council / Pradeshiya Saba" value={formData.municipal_council_pradeshiya_saba} onChange={field('municipal_council_pradeshiya_saba')} span2 />
              <FormField label="Certificate Division File No" value={formData.certificate_division_file_no} onChange={field('certificate_division_file_no')} />
              <FormField label="Land Registry Approved Date" value={formData.land_registry_approved_date} onChange={field('land_registry_approved_date')} />

              <SectionLabel>Registration Form Details</SectionLabel>
              <FormField label="Non-res Shops" type="number" value={formData.non_res_shops} onChange={field('non_res_shops')} />
              <FormField label="Non-res Office" type="number" value={formData.non_res_office} onChange={field('non_res_office')} />
              <FormField label="Non-res Hotel" type="number" value={formData.non_res_hotel} onChange={field('non_res_hotel')} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, gridColumn: 'span 2' }}>
                <CheckboxField label="Services Lift" checked={formData.services_lift} onChange={field('services_lift')} />
                <CheckboxField label="Fire Agreement" checked={formData.services_fire_agreement} onChange={field('services_fire_agreement')} />
                <CheckboxField label="Generator Agreement" checked={formData.services_generator_agreement} onChange={field('services_generator_agreement')} />
                <CheckboxField label="Insurance" checked={formData.services_insurance} onChange={field('services_insurance')} />
                <CheckboxField label="Common Parking" checked={formData.fac_common_parking} onChange={field('fac_common_parking')} />
                <CheckboxField label="Gym" checked={formData.fac_gym} onChange={field('fac_gym')} />
                <CheckboxField label="Swimming Pool" checked={formData.fac_swimming_pool} onChange={field('fac_swimming_pool')} />
                <CheckboxField label="Restaurant" checked={formData.fac_restaurant} onChange={field('fac_restaurant')} />
                <CheckboxField label="Super Market" checked={formData.fac_super_market} onChange={field('fac_super_market')} />
                <CheckboxField label="Garden" checked={formData.fac_garden} onChange={field('fac_garden')} />
                <CheckboxField label="Sauna" checked={formData.fac_sauna} onChange={field('fac_sauna')} />
                <CheckboxField label="Salon" checked={formData.fac_salon} onChange={field('fac_salon')} />
                <CheckboxField label="Golf/Tennis" checked={formData.fac_golf_tennis} onChange={field('fac_golf_tennis')} />
                <CheckboxField label="Day Care" checked={formData.fac_day_care} onChange={field('fac_day_care')} />
                <CheckboxField label="Management Company Controlled" checked={formData.mgmt_company_controlled} onChange={field('mgmt_company_controlled')} />
                <CheckboxField label="Written Assurance Fulfilled" checked={formData.written_assurance_fulfilled} onChange={field('written_assurance_fulfilled')} />
              </div>
              <FormField label="Management Company Name" value={formData.mgmt_company_name} onChange={field('mgmt_company_name')} />
              <FormField label="Management Company Contact" value={formData.mgmt_company_contact} onChange={field('mgmt_company_contact')} />
              <FormField label="Secretary Contact" value={formData.secretary_contact} onChange={field('secretary_contact')} />
              <FormField label="Secretary Email" value={formData.secretary_email} onChange={field('secretary_email')} />
              <FormField label="Treasurer Contact" value={formData.treasurer_contact} onChange={field('treasurer_contact')} />
              <FormField label="Treasurer Email" value={formData.treasurer_email} onChange={field('treasurer_email')} />
              <CouncilMembersEditor value={formData.council_members} onChange={field('council_members')} />

              <SectionLabel>Personnel</SectionLabel>
              <FormField label="Secretary" value={formData.secretary} onChange={field('secretary')} />
              <FormField label="Secretary Unit No" value={formData.secretary_unit_no} onChange={field('secretary_unit_no')} />
              <FormField label="Treasurer" value={formData.treasurer} onChange={field('treasurer')} />
              <FormField label="Treasurer Unit No" value={formData.treasurer_unit_no} onChange={field('treasurer_unit_no')} />
              <FormField label="MC" value={formData.mc} onChange={field('mc')} />
              <FormField label="Engineer" value={formData.engineer} onChange={field('engineer')} />
              <FormField label="MA" value={formData.ma} onChange={field('ma')} />

              <SectionLabel>AGM &amp; Renewal</SectionLabel>
              <FormField label="AGM Date" value={formData.agm_date} onChange={field('agm_date')} />
              <FormField label="Next AGM Date" value={formData.next_agm_date} onChange={field('next_agm_date')} />
              <FormField label="Renewal Period" value={formData.renewal_period} onChange={field('renewal_period')} />
              <FormField label="Renewal Date Vise" value={formData.renewal_date_vise} onChange={field('renewal_date_vise')} />
              <FormField label="AGM Date Vise" value={formData.agm_date_vise} onChange={field('agm_date_vise')} />

              <SectionLabel>Compliance Documents</SectionLabel>
              <FormField label="AGM Minutes" value={formData.agm_minutes} onChange={field('agm_minutes')} />
              <FormField label="Attendance" value={formData.attendance} onChange={field('attendance')} />
              <FormField label="Audited Accounts" value={formData.audited_accounts} onChange={field('audited_accounts')} />
              <FormField label="Final Accounts" value={formData.final_accounts} onChange={field('final_accounts')} />
              <FormField label="Building Insurance" value={formData.building_insurance} onChange={field('building_insurance')} />
              <FormField label="Sinking Fund" value={formData.sinking_fund} onChange={field('sinking_fund')} />
              <FormField label="Budget Proposal" value={formData.budget_proposal} onChange={field('budget_proposal')} />

              <SectionLabel>Status</SectionLabel>
              <FormSelect label="Status" value={formData.status} onChange={field('status')} options={['Active', 'Non Active', 'Pending']} />
            </div>

            <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModalOpen(false)} style={btnOutline}>Cancel</button>
              <button onClick={save} style={btnPrimary}><i className="fas fa-save" /> {editingId ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal — unchanged */}
      {viewModalOpen && viewRecord && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setViewModalOpen(false)}>
          <div style={{ ...modalStyle, maxWidth: 900 }}>
            <div style={modalHeader}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>MC Record Details</span>
              <button onClick={() => setViewModalOpen(false)} style={closeBtnStyle}>✕</button>
            </div>

            <div style={{ padding: 22, maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>Identity &amp; Filing</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
                <ViewField label="Reg Date" value={formatDisplayDate(viewRecord.reg_date)} />
                <ViewField label="Old File No" value={viewRecord.old_file_no} />
                <ViewField label="New File No" value={viewRecord.new_file_no} />
                <ViewField label="Management Corporation Name" value={viewRecord.management_corporation_name || viewRecord.name} />
                <ViewField label="Address" value={viewRecord.address} />
                <ViewField label="Plan No" value={viewRecord.plan_no} />
                <ViewField label="Declaration No" value={viewRecord.declaration_no} />
                <ViewField label="Email Address" value={viewRecord.email_address} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>Units</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
                <ViewField label="Total Units" value={viewRecord.units} />
                <ViewField label="Residential" value={viewRecord.residential ?? viewRecord.residential_units} />
                <ViewField label="Non Residential" value={viewRecord.non_residential ?? viewRecord.non_residential_units} />
                <ViewField label="Service Units" value={viewRecord.service_units} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>Classification &amp; Location</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
                <ViewField label="Category" value={viewRecord.category} />
                <ViewField label="Year" value={viewRecord.year} />
                <ViewField label="Town" value={viewRecord.town} />
                <ViewField label="Municipal Council / Pradeshiya Saba" value={viewRecord.municipal_council_pradeshiya_saba} />
                <ViewField label="Certificate Division File No" value={viewRecord.certificate_division_file_no} />
                <ViewField label="Land Registry Approved Date" value={viewRecord.land_registry_approved_date} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>Registration Form Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
                <ViewField label="Non-res Shops" value={viewRecord.non_res_shops} />
                <ViewField label="Non-res Office" value={viewRecord.non_res_office} />
                <ViewField label="Non-res Hotel" value={viewRecord.non_res_hotel} />
                <ViewField label="Services Lift" value={formatBoolean(viewRecord.services_lift)} />
                <ViewField label="Fire Agreement" value={formatBoolean(viewRecord.services_fire_agreement)} />
                <ViewField label="Generator Agreement" value={formatBoolean(viewRecord.services_generator_agreement)} />
                <ViewField label="Insurance" value={formatBoolean(viewRecord.services_insurance)} />
                <ViewField label="Common Parking" value={formatBoolean(viewRecord.fac_common_parking)} />
                <ViewField label="Gym" value={formatBoolean(viewRecord.fac_gym)} />
                <ViewField label="Swimming Pool" value={formatBoolean(viewRecord.fac_swimming_pool)} />
                <ViewField label="Restaurant" value={formatBoolean(viewRecord.fac_restaurant)} />
                <ViewField label="Super Market" value={formatBoolean(viewRecord.fac_super_market)} />
                <ViewField label="Garden" value={formatBoolean(viewRecord.fac_garden)} />
                <ViewField label="Sauna" value={formatBoolean(viewRecord.fac_sauna)} />
                <ViewField label="Salon" value={formatBoolean(viewRecord.fac_salon)} />
                <ViewField label="Golf/Tennis" value={formatBoolean(viewRecord.fac_golf_tennis)} />
                <ViewField label="Day Care" value={formatBoolean(viewRecord.fac_day_care)} />
                <ViewField label="Management Company Controlled" value={formatBoolean(viewRecord.mgmt_company_controlled)} />
                <ViewField label="Management Company Name" value={viewRecord.mgmt_company_name} />
                <ViewField label="Management Company Contact" value={viewRecord.mgmt_company_contact} />
                <ViewField label="Secretary Contact" value={viewRecord.secretary_contact} />
                <ViewField label="Secretary Email" value={viewRecord.secretary_email} />
                <ViewField label="Treasurer Contact" value={viewRecord.treasurer_contact} />
                <ViewField label="Treasurer Email" value={viewRecord.treasurer_email} />
                <ViewField label="Written Assurance Fulfilled" value={formatBoolean(viewRecord.written_assurance_fulfilled)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>Council Members (I–XII)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
                  {(() => {
                    const rows = Array.isArray(viewRecord.council_members)
                      ? viewRecord.council_members
                      : (() => { try { return JSON.parse(viewRecord.council_members || '[]'); } catch (e) { return []; } })();
                    return Array.from({ length: 12 }, (_, idx) => rows[idx] || {}).map((row, idx) => (
                      <div key={idx} style={{ background: theme.bg, borderRadius: 10, padding: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: theme.navy, marginBottom: 4 }}>{String.fromCharCode(73 + idx)}</div>
                        <div style={{ fontSize: 12, color: theme.text }}>{row.name || '—'}</div>
                        <div style={{ fontSize: 11, color: theme.text3 }}>{row.unit_no ? `Unit No: ${row.unit_no}` : '—'}</div>
                        <div style={{ fontSize: 11, color: theme.text3 }}>{row.contact_no ? `Contact: ${row.contact_no}` : '—'}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>Personnel</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
                <ViewField label="Secretary" value={viewRecord.secretary} />
                <ViewField label="Secretary Unit No" value={viewRecord.secretary_unit_no} />
                <ViewField label="Treasurer" value={viewRecord.treasurer} />
                <ViewField label="Treasurer Unit No" value={viewRecord.treasurer_unit_no} />
                <ViewField label="MC" value={viewRecord.mc} />
                <ViewField label="Engineer" value={viewRecord.engineer} />
                <ViewField label="MA" value={viewRecord.ma} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>AGM &amp; Renewal</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
                <ViewField label="AGM Date" value={viewRecord.agm_date} />
                <ViewField label="Next AGM Date" value={viewRecord.next_agm_date} />
                <ViewField label="Renewal Period" value={viewRecord.renewal_period} />
                <ViewField label="Renewal Date Vise" value={viewRecord.renewal_date_vise} />
                <ViewField label="AGM Date Vise" value={viewRecord.agm_date_vise} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>Compliance Documents</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
                <ViewField label="AGM Minutes" value={viewRecord.agm_minutes} />
                <ViewField label="Attendance" value={viewRecord.attendance} />
                <ViewField label="Audited Accounts" value={viewRecord.audited_accounts} />
                <ViewField label="Final Accounts" value={viewRecord.final_accounts} />
                <ViewField label="Building Insurance" value={viewRecord.building_insurance} />
                <ViewField label="Sinking Fund" value={viewRecord.sinking_fund} />
                <ViewField label="Budget Proposal" value={viewRecord.budget_proposal} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

      {/* Approval Checklist Modal */}
      {checklistModalOpen && checklistRecord && (
        <ApprovalChecklistModal
          record={checklistRecord}
          onClose={() => setChecklistModalOpen(false)}
          onSave={handleChecklistSave}
          onApprove={handleChecklistApprove}
          onReject={handleChecklistReject}
        />
      )}

      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => { setShowHistoryModal(false); setSelectedHistoryRecord(null); }}
        record={selectedHistoryRecord}
        theme={theme}
      />

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 9999, background: '#fff', border: `1px solid ${theme.border}`, borderLeft: `4px solid ${toast.type === 'error' ? theme.red : toast.type === 'info' ? theme.blue : theme.green}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px rgba(0,0,0,.12)', minWidth: 240 }}>
          <i className={`fas fa-${toast.type === 'error' ? 'times-circle' : 'check-circle'}`} style={{ color: toast.type === 'error' ? theme.red : theme.green, fontSize: 15 }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}