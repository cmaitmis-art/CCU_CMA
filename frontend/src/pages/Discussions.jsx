import { useEffect, useMemo, useState } from 'react';
import '../CMAStyles.css';
import * as XLSX from 'xlsx';
import {
  fetchDiscussions,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  deleteAllDiscussions,
} from '../api';
import HistoryModal from '../components/HistoryModal.jsx';

window.XLSX = XLSX;

// Load jsPDF from CDN once (no npm install needed) for PDF downloads
if (typeof window !== 'undefined' && !window.jspdf && !document.getElementById('jspdf-cdn-script')) {
  const script = document.createElement('script');
  script.id = 'jspdf-cdn-script';
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  document.head.appendChild(script);
}

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
const btnSecondary = { ...btnBase, background: '#fff', color: theme.text, border: `1px solid ${theme.border}` };
const btnDanger = { ...btnBase, background: theme.red, color: '#fff' };

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 20,
};

const modalStyle = {
  background: '#fff',
  borderRadius: 16,
  width: '100%',
  maxWidth: 750,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  maxHeight: '90vh',
  overflowY: 'auto',
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

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  return `${dateStr} ${time}`;
}

const STATUS_OPTIONS = ['New', 'In Progress', 'Completed', 'Cancelled'];

export default function DiscussionManagement({ currentUser }) {
  const auditUserLabel = currentUser?.name && currentUser?.username
    ? `${currentUser.name} (${currentUser.username})`
    : currentUser?.name || currentUser?.username || '';
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(() => {
    const filter = localStorage.getItem('cma_discussion_filter');
    if (filter) {
      localStorage.removeItem('cma_discussion_filter');
      return filter;
    }
    return '';
  });
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [reminderAlert, setReminderAlert] = useState(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    file_no: '',
    appointment: '',
    complaint: '',
    respond: '',
    meeting_date_time: '',
    venue: '',
    reminder_date: '',
    reminder_notes: '',
    officer: '',
    status: 'New',
  });

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchText]);


  useEffect(() => {
    loadDiscussions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);




  const loadDiscussions = async () => {
    setLoading(true);
    try {
      const data = await fetchDiscussions(page, limit, searchText);
      const loadedDiscussions = data.discussions || [];
      setDiscussions(loadedDiscussions);
      setTotalCount(data.totalItems || 0);

      // IMPORTANT: reminder alert must consider ALL discussions (not only the current page)
      // otherwise due reminders may exist on other pages and the alert would not show.
      const allData = await fetchDiscussions(1, 999999, searchText);
      const allDiscussions = allData.discussions || [];


      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const due = allDiscussions.filter((d) => {
        if (!d.reminder_date) return false;
        if (d.status === 'Completed' || d.status === 'Cancelled') return false;
        const rd = new Date(d.reminder_date);
        if (Number.isNaN(rd.getTime())) return false;
        rd.setHours(0, 0, 0, 0);
        return rd <= today;
      });

      // Always show reminder popup when there are due reminders (from DB data).
      setReminderAlert(due.length > 0 ? due : null);




    } catch (err) {
      showToast('Failed to load discussions', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ msg: message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleOpenModal = (discussion = null) => {
    if (discussion) {
      setEditingId(discussion.id);
      setFormData({
        date: discussion.date ? new Date(discussion.date).toISOString().split('T')[0] : '',
        file_no: discussion.file_no || '',
        appointment: discussion.appointment || '',
        complaint: discussion.complaint || '',
        respond: discussion.respond || '',
        meeting_date_time: discussion.meeting_date_time || '',
        venue: discussion.venue || '',
        reminder_date: discussion.reminder_date ? new Date(discussion.reminder_date).toISOString().split('T')[0] : '',
        reminder_notes: discussion.reminder_notes || '',
        officer: discussion.officer || '',
        status: discussion.status || 'New',
      });
    } else {
      setEditingId(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        file_no: '',
        appointment: '',
        complaint: '',
        respond: '',
        meeting_date_time: '',
        venue: '',
        reminder_date: '',
        reminder_notes: '',
        officer: '',
        status: 'New',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file_no.trim() || !formData.appointment.trim()) {
      showToast('File No and Appointment are required', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        ...(auditUserLabel ? { created_by: auditUserLabel, modified_by: auditUserLabel } : {}),
      };

      if (editingId) {
        await updateDiscussion(editingId, payload);
        showToast('Discussion updated successfully');
      } else {
        await createDiscussion(payload);
        showToast('Discussion created successfully');
      }
      handleCloseModal();
      loadDiscussions();
    } catch (err) {
      showToast(err.message || 'Failed to save discussion', 'error');
      console.error(err);
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      title: 'Delete Discussion',
      message: 'Are you sure you want to delete this discussion?',
      onConfirm: async () => {
        try {
          await deleteDiscussion(id);
          showToast('Discussion deleted successfully');
          loadDiscussions();
          setConfirmDialog(null);
        } catch (err) {
          showToast(err.message || 'Failed to delete discussion', 'error');
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleDeleteAll = () => {
    setConfirmDialog({
      title: 'Delete All Discussions',
      message: 'Are you sure you want to delete all discussions? This cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteAllDiscussions();
          showToast('All discussions deleted successfully');
          loadDiscussions();
          setConfirmDialog(null);
        } catch (err) {
          showToast(err.message || 'Failed to delete discussions', 'error');
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  async function exportExcel() {
    try {
      if (typeof window.XLSX === 'undefined') return showToast('XLSX library not loaded', 'error');
      showToast('Exporting all discussions...');

      const rows = (discussions || []).map((r) => ({
        'File No': r.file_no ?? '',
        'Date': formatDate(r.date),
        'Appointment': r.appointment ?? '',
        'Complaint': r.complaint ?? '',
        'Response': r.respond ?? '',
        'Meeting Date & Time': r.meeting_date_time ?? '',
        'Venue': r.venue ?? '',
        'Reminder Date': r.reminder_date ? formatDate(r.reminder_date) : '',
        'Reminder Notes': r.reminder_notes ?? '',
        'Officer': r.officer ?? '',
        'Status': r.status ?? '',
        'Created By': r.created_by ?? '',
        'Modified By': r.modified_by ?? '',
      }));
      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Discussions');
      window.XLSX.writeFile(wb, `CMA_Discussions_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Exported ✅');
    } catch (err) {
      showToast(err.message || 'Export failed', 'error');
    }
  }

  // Generates a blank Excel template with the exact column headers importExcel expects,
  // plus one example row, so users know what to fill in before importing.
  function downloadImportTemplate() {
    try {
      if (typeof window.XLSX === 'undefined') return showToast('XLSX library not loaded', 'error');

      const headers = [
        'File No',
        'Date',
        'Appointment',
        'Complaint',
        'Response',
        'Meeting Date & Time',
        'Venue',
        'Reminder Date',
        'Reminder Notes',
        'Officer',
        'Status',
      ];

      const exampleRow = {
        'File No': 'CMA/REG/2026/001',
        'Date': '2026-06-23',
        'Appointment': 'Initial Meeting',
        'Complaint': 'Sample complaint description',
        'Response': 'Sample response notes',
        'Meeting Date & Time': '2026-06-30 10:00',
        'Venue': 'Conference Room A',
        'Reminder Date': '2026-06-28',
        'Reminder Notes': 'Call before meeting',
        'Officer': 'A. Perera',
        'Status': 'New',
      };

      const ws = window.XLSX.utils.json_to_sheet([exampleRow], { header: headers });
      ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }));
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Discussions Template');
      window.XLSX.writeFile(wb, 'CMA_Discussions_Import_Template.xlsx');
      showToast('Template downloaded ✅');
    } catch (err) {
      showToast(err.message || 'Could not generate template', 'error');
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
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!rows.length) return showToast('No data found in sheet', 'error');

      console.log('Excel data:', rows);

      let imported = 0;

      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];

        const normalizeCell = (val) => {
          if (val === null || val === undefined) return '';
          if (typeof val === 'number') {
            if (!Number.isFinite(val)) return '';
            return String(Math.trunc(val)).trim();
          }
          return String(val ?? '').trim();
        };

        const getField = (...names) => {
          for (const name of names) {
            const raw = row[name];
            const val = normalizeCell(raw);
            if (val && val !== '__EMPTY') return val;
          }
          return '';
        };

        const fileNoCandidates = [
          'File No',
          'file_no',
          'FileNo',
          'Fileno',
          'File#',
          'Reference',
          'ID',
          'id',
          'No',
          'Number',
        ];

        const file_no = getField(...fileNoCandidates);

        const appointment = getField('Appointment', 'appointment', 'Appt', 'Meeting', 'Title', 'Subject', 'Event', 'Task');
        const date = getField('Date', 'date', 'Date Created', 'Created', 'When') || new Date().toISOString().split('T')[0];
        const complaint = getField('Complaint', 'complaint', 'Issue', 'Description', 'Details', 'Problem');
        const respond = getField('Response', 'respond', 'Responder', 'Reply', 'Comment', 'Answer');
        const meeting_date_time = getField('Meeting Date & Time', 'meeting_date_time', 'Meeting Date', 'DateTime', 'Scheduled', 'When', 'Time');
        const venue = getField('Venue', 'venue', 'Location', 'Place', 'Room', 'Where');
        const reminder_date = getField('Reminder Date', 'reminder_date', 'Reminder', 'Follow-up', 'Due');
        const reminder_notes = getField('Reminder Notes', 'reminder_notes', 'Notes', 'Comments', 'Remarks', 'Memo');
        const officer = getField('Officer', 'officer', 'Assigned to', 'Assignee', 'Person', 'Name', 'Contact');
        const status = getField('Status', 'status', 'State', 'Progress') || 'New';

        const allValues = Object.values(row).map(v => String(v).trim()).filter(v => v && v !== '__EMPTY');
        if (allValues.length === 0) {
          console.warn(`Row ${idx + 1} is completely empty, skipping...`);
          continue;
        }

        const record = {
          file_no: file_no || `FILE-${idx + 1}`,
          date: date,
          appointment: appointment || complaint || `Meeting ${idx + 1}`,
          complaint: complaint,
          respond: respond,
          meeting_date_time: meeting_date_time,
          venue: venue,
          reminder_date: reminder_date,
          reminder_notes: reminder_notes,
          officer: officer,
          status: status,
          ...(auditUserLabel ? { created_by: auditUserLabel, modified_by: auditUserLabel } : {}),
        };

        try {
          await createDiscussion(record);
          imported += 1;
        } catch (rowErr) {
          console.error(`❌ Row ${idx + 1} failed:`, rowErr.message);
        }
      }

      if (imported === 0) {
        showToast(`❌ Failed to import any rows.`, 'error');
        return;
      }
      showToast(`✅ Successfully imported ${imported} discussion(s)!`);
      loadDiscussions();
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
      console.error('Import error:', err);
    } finally {
      e.target.value = '';
    }
  }

  function downloadRow(discussion) {
    try {
      const jsPDFCtor = window.jspdf?.jsPDF;
      if (typeof jsPDFCtor === 'undefined') return showToast('jsPDF library not loaded', 'error');

      const doc = new jsPDFCtor({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 40;
      let y = 100;

      const navy = [26, 58, 107];
      const text3 = [148, 160, 180];
      const border = [226, 232, 240];

      // Header bar
      doc.setFillColor(...navy);
      doc.rect(0, 0, pageWidth, 70, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`Discussion — ${discussion.file_no || '—'}`, marginX, 35);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`CMA Discussion Management  •  Generated ${new Date().toLocaleString('en-LK')}`, marginX, 52);

      // Status badge (top right)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const statusText = discussion.status || '—';
      const badgeWidth = doc.getTextWidth(statusText) + 20;
      doc.setDrawColor(255, 255, 255);
      doc.roundedRect(pageWidth - marginX - badgeWidth, 24, badgeWidth, 22, 4, 4, 'S');
      doc.text(statusText, pageWidth - marginX - badgeWidth + 10, 39);

      doc.setTextColor(0, 0, 0);

      const field = (label, value) => {
        doc.setFontSize(8);
        doc.setTextColor(...text3);
        doc.setFont('helvetica', 'bold');
        doc.text(label.toUpperCase(), marginX, y);
        doc.setFontSize(11);
        doc.setTextColor(20, 20, 30);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(String(value || '—'), pageWidth - marginX * 2);
        doc.text(lines, marginX, y + 14);
        y += 14 + lines.length * 13 + 14;
      };

      // Two-column basic info
      const colWidth = (pageWidth - marginX * 2 - 20) / 2;
      doc.setFontSize(8);
      doc.setTextColor(...text3);
      doc.setFont('helvetica', 'bold');
      doc.text('DATE', marginX, y);
      doc.text('APPOINTMENT', marginX + colWidth + 20, y);
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 30);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(discussion.date), marginX, y + 14);
      doc.text(String(discussion.appointment || '—'), marginX + colWidth + 20, y + 14);
      y += 38;

      doc.setFontSize(8);
      doc.setTextColor(...text3);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICER', marginX, y);
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 30);
      doc.setFont('helvetica', 'normal');
      doc.text(String(discussion.officer || '—'), marginX, y + 14);
      y += 38;

      // Meeting highlight box
      if (discussion.meeting_date_time || discussion.venue) {
        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(191, 219, 254);
        doc.roundedRect(marginX, y, pageWidth - marginX * 2, 44, 5, 5, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(37, 99, 235);
        doc.setFont('helvetica', 'bold');
        doc.text('MEETING TIME', marginX + 12, y + 16);
        doc.text('VENUE', marginX + colWidth + 20, y + 16);
        doc.setFontSize(11);
        doc.setTextColor(...navy);
        doc.setFont('helvetica', 'normal');
        doc.text(discussion.meeting_date_time ? formatDateTime(discussion.meeting_date_time) : '—', marginX + 12, y + 32);
        doc.text(discussion.venue || '—', marginX + colWidth + 20, y + 32);
        y += 60;
      }

      // Reminder box
      if (discussion.reminder_date || discussion.reminder_notes) {
        const noteLines = doc.splitTextToSize(discussion.reminder_notes || '', pageWidth - marginX * 2 - 24);
        const boxHeight = 36 + noteLines.length * 12;
        doc.setFillColor(255, 251, 235);
        doc.setDrawColor(253, 230, 138);
        doc.roundedRect(marginX, y, pageWidth - marginX * 2, boxHeight, 5, 5, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(217, 119, 6);
        doc.setFont('helvetica', 'bold');
        doc.text('REMINDER', marginX + 12, y + 16);
        doc.setFontSize(11);
        doc.setTextColor(146, 64, 14);
        doc.setFont('helvetica', 'bold');
        doc.text(discussion.reminder_date ? formatDate(discussion.reminder_date) : '', marginX + 12, y + 30);
        doc.setFontSize(10);
        doc.setTextColor(120, 53, 15);
        doc.setFont('helvetica', 'normal');
        doc.text(noteLines, marginX + 12, y + 44);
        y += boxHeight + 16;
      }

      if (discussion.complaint) field('Complaint', discussion.complaint);
      if (discussion.respond) field('Response', discussion.respond);

      // Footer
      doc.setDrawColor(...border);
      doc.line(marginX, 780, pageWidth - marginX, 780);
      doc.setFontSize(8);
      doc.setTextColor(...text3);
      doc.setFont('helvetica', 'normal');
      doc.text('CMA — Condominium Management Authority', marginX, 792);
      doc.text(`File: ${discussion.file_no || '—'}`, pageWidth - marginX - doc.getTextWidth(`File: ${discussion.file_no || '—'}`), 792);

      doc.save(`Discussion_${discussion.file_no || discussion.id}.pdf`);
      showToast('Downloaded ✅');
    } catch (err) {
      showToast(err.message || 'Download failed', 'error');
    }
  }

  function printRow(discussion) {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Notice — ${discussion.file_no}</title>
      <style>
        @page { size: A4; margin: 16mm }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a2e; margin: 0 }
        .notice { border: 2px solid #1a3a6b; border-radius: 4px; padding: 22px 26px }
        .notice-hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a3a6b; padding-bottom: 12px; margin-bottom: 18px }
        .notice-hdr h2 { margin: 0; font-size: 22px; letter-spacing: 1px; color: #1a3a6b }
        .notice-hdr p { margin: 4px 0 0; font-size: 11px; color: #5a6478 }
        .notice-ref { text-align: right }
        .notice-ref .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: #94a0b4; font-weight: 700 }
        .notice-ref .val { font-size: 14px; font-weight: 700; color: #1a3a6b }
        .salutation { font-size: 13px; margin-bottom: 10px }
        .body-text { font-size: 12px; line-height: 1.7; color: #1a1a2e; margin-bottom: 16px; text-align: justify }
        .block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 10px 12px; margin-bottom: 12px }
        .block.remind { background: #fffbeb; border-color: #fde68a }
        .block-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: #94a0b4; font-weight: 700; margin-bottom: 4px }
        .block-val { font-size: 12px; color: #1a1a2e; line-height: 1.5 }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 16px 0 }
        .cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 8px 10px }
        .cell-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: #94a0b4; font-weight: 700; margin-bottom: 3px }
        .cell-val { font-size: 12px; font-weight: 600; color: #1a1a2e }
        .sign-row { display: flex; gap: 40px; margin: 28px 0 8px }
        .sign-box { flex: 1 }
        .sign-line { border-bottom: 1px solid #1a1a2e; height: 32px }
        .sign-lbl { font-size: 10px; color: #94a0b4; margin-top: 4px }
        .footer { margin-top: 14px; font-size: 9px; color: #94a0b4; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: right }
      </style></head><body>
      <div class="notice">
        <div class="notice-hdr">
          <div>
            <h2>NOTICE</h2>
            <p>CMA — Condominium Management Authority</p>
          </div>
          <div class="notice-ref">
            <div class="lbl">File No</div>
            <div class="val">${discussion.file_no || '—'}</div>
          </div>
        </div>

        <p class="salutation">To: <strong>${discussion.appointment || '—'}</strong></p>

        <p class="body-text">
          This notice is issued in respect of the above-referenced file.
          ${discussion.meeting_date_time ? `You are hereby notified to attend a meeting scheduled on <strong>${formatDateTime(discussion.meeting_date_time)}</strong>${discussion.venue ? ` at <strong>${discussion.venue}</strong>` : ''}.` : ''}
        </p>

        ${discussion.complaint ? `
        <div class="block">
          <div class="block-lbl">Subject / Complaint</div>
          <div class="block-val">${discussion.complaint}</div>
        </div>` : ''}

        ${discussion.respond ? `
        <div class="block">
          <div class="block-lbl">Response / Remarks</div>
          <div class="block-val">${discussion.respond}</div>
        </div>` : ''}

        ${(discussion.reminder_date || discussion.reminder_notes) ? `
        <div class="block remind">
          <div class="block-lbl">Reminder</div>
          <div class="block-val">${discussion.reminder_date ? formatDate(discussion.reminder_date) : ''} ${discussion.reminder_notes ? `— ${discussion.reminder_notes}` : ''}</div>
        </div>` : ''}

        <div class="grid3">
          <div class="cell"><div class="cell-lbl">Date</div><div class="cell-val">${formatDate(discussion.date)}</div></div>
          <div class="cell"><div class="cell-lbl">Officer</div><div class="cell-val">${discussion.officer || '—'}</div></div>
          <div class="cell"><div class="cell-lbl">Status</div><div class="cell-val">${discussion.status || '—'}</div></div>
        </div>

        <div class="sign-row">
          <div class="sign-box"><div class="sign-line"></div><div class="sign-lbl">Issuing Officer</div></div>
          <div class="sign-box"><div class="sign-line"></div><div class="sign-lbl">Date</div></div>
        </div>

        <div class="footer">Issued ${new Date().toLocaleString('en-LK')} &bull; File: ${discussion.file_no || '—'}</div>
      </div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  const filteredDiscussions = useMemo(() => {
    let result = discussions;

    if (statusFilter) {
      result = result.filter((d) => d.status === statusFilter);
    }

    const term = searchText.trim().toLowerCase();
    if (term) {
      result = result.filter((d) => {
        return [d.file_no, d.appointment, d.complaint, d.respond, d.officer]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      });
    }

    return result;
  }, [discussions, searchText, statusFilter]);

  const stats = useMemo(() => {
    return discussions.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'New') acc.new += 1;
        if (item.status === 'In Progress') acc.inProgress += 1;
        if (item.status === 'Completed') acc.completed += 1;
        if (item.status === 'Cancelled') acc.cancelled += 1;
        return acc;
      },
      { total: 0, new: 0, inProgress: 0, completed: 0, cancelled: 0 }
    );
  }, [discussions]);

  const pageCount = Math.max(1, Math.ceil((totalCount || filteredDiscussions.length) / limit));

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, padding: 24, fontFamily: "'Inter', sans-serif" }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, fontSize: 12, color: theme.text3 }}>
        Home / Discussion Management
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, color: theme.text }}>Discussion Management</h2>
          <p style={{ margin: '8px 0 0', color: theme.text2 }}>Manage meeting discussions, appointments, and reminders.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Delete All — styled warning button with icon */}
          <button
            onClick={() => handleDeleteAll()}
            style={{
              ...btnBase,
              background: '#fff1f2',
              color: '#dc2626',
              border: '1.5px solid #fecaca',
              fontWeight: 600,
              padding: '8px 16px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
          >
            <i className="fas fa-trash-alt" style={{ fontSize: 12 }} /> Delete All
          </button>
          <button onClick={() => handleOpenModal()} style={btnPrimary}>
            <i className="fas fa-plus" /> New Discussion
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: stats.total, icon: 'fa-comments', iconColor: '#2563eb', iconBg: '#eff6ff', border: '#bfdbfe' },
          { label: 'New', value: stats.new, icon: 'fa-star', iconColor: '#7c3aed', iconBg: '#f5f3ff', border: '#ddd6fe' },
          { label: 'In Progress', value: stats.inProgress, icon: 'fa-spinner', iconColor: '#d97706', iconBg: '#fffbeb', border: '#fde68a' },
          { label: 'Completed', value: stats.completed, icon: 'fa-check-circle', iconColor: '#16a34a', iconBg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'Cancelled', value: stats.cancelled, icon: 'fa-times-circle', iconColor: '#dc2626', iconBg: '#fef2f2', border: '#fecaca' },
        ].map(({ label, value, icon, iconColor, iconBg, border }) => (
          <div key={label} style={{ background: theme.card, borderRadius: 12, padding: '16px 18px', border: `1.5px solid ${border}`, boxShadow: '0 2px 8px rgba(0,0,0,.04)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              <i className={`fas ${icon}`} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.7px', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: iconColor, lineHeight: 1.2 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Card */}
      <div style={{ background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: '0 10px 28px rgba(15,23,42,.06)' }}>
        {/* Controls */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: theme.text }}>Discussions</h3>
            <div style={{ marginTop: 3, color: theme.text2, fontSize: 12 }}>{filteredDiscussions.length} record{filteredDiscussions.length !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search discussions..."
              style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${theme.border}`, minWidth: 200, fontSize: 13 }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${theme.border}`, fontSize: 13 }}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            {/* Export Excel */}
            <button
              onClick={exportExcel}
              style={{ ...btnBase, background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0', padding: '8px 14px', fontWeight: 600 }}
              title="Export to Excel"
            >
              <i className="fas fa-file-excel" style={{ fontSize: 13 }} /> Export
            </button>
            {/* Download Import Template */}
            <button
              onClick={downloadImportTemplate}
              style={{ ...btnBase, background: '#f8fafc', color: theme.text2, border: `1.5px solid ${theme.border}`, padding: '8px 14px', fontWeight: 600 }}
              title="Download a blank Excel template with the correct columns for importing"
            >
              <i className="fas fa-download" style={{ fontSize: 13 }} /> Template
            </button>
            {/* Import Excel */}
            <label style={{ ...btnBase, background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', padding: '8px 14px', fontWeight: 600, cursor: 'pointer' }} title="Import from Excel. Expected columns: File No, Date, Appointment, Complaint, Response, Meeting Date & Time, Venue, Reminder Date, Reminder Notes, Officer, Status">
              <i className="fas fa-file-import" style={{ fontSize: 13 }} /> Import
              <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={importExcel} />
            </label>
            <span
              style={{ fontSize: 11, color: theme.text3, display: 'flex', alignItems: 'center', gap: 4, maxWidth: 220 }}
              title="Expected columns: File No, Date, Appointment, Complaint, Response, Meeting Date & Time, Venue, Reminder Date, Reminder Notes, Officer, Status"
            >
              <i className="fas fa-info-circle" style={{ fontSize: 11 }} />
              Needs: File No, Date, Appointment...
            </span>
            {/* Print All */}
            <button
              onClick={() => {
                const w = window.open('', '_blank'); if (!w) return;
                const noticeHtml = filteredDiscussions.map((d) => `
                  <div class="notice">
                    <div class="notice-hdr">
                      <div>
                        <h2>NOTICE</h2>
                        <p>CMA — Condominium Management Authority</p>
                      </div>
                      <div class="notice-ref">
                        <div class="lbl">File No</div>
                        <div class="val">${d.file_no || '—'}</div>
                      </div>
                    </div>

                    <p class="salutation">To: <strong>${d.appointment || '—'}</strong></p>

                    <p class="body-text">
                      This notice is issued in respect of the above-referenced file.
                      ${d.meeting_date_time ? `You are hereby notified to attend a meeting scheduled on <strong>${formatDateTime(d.meeting_date_time)}</strong>${d.venue ? ` at <strong>${d.venue}</strong>` : ''}.` : ''}
                    </p>

                    ${d.complaint ? `
                    <div class="block">
                      <div class="block-lbl">Subject / Complaint</div>
                      <div class="block-val">${d.complaint}</div>
                    </div>` : ''}

                    ${d.respond ? `
                    <div class="block">
                      <div class="block-lbl">Response / Remarks</div>
                      <div class="block-val">${d.respond}</div>
                    </div>` : ''}

                    ${(d.reminder_date || d.reminder_notes) ? `
                    <div class="block remind">
                      <div class="block-lbl">Reminder</div>
                      <div class="block-val">${d.reminder_date ? formatDate(d.reminder_date) : ''} ${d.reminder_notes ? `— ${d.reminder_notes}` : ''}</div>
                    </div>` : ''}

                    <div class="grid3">
                      <div class="cell"><div class="cell-lbl">Date</div><div class="cell-val">${formatDate(d.date)}</div></div>
                      <div class="cell"><div class="cell-lbl">Officer</div><div class="cell-val">${d.officer || '—'}</div></div>
                      <div class="cell"><div class="cell-lbl">Status</div><div class="cell-val">${d.status || '—'}</div></div>
                    </div>

                    <div class="sign-row">
                      <div class="sign-box"><div class="sign-line"></div><div class="sign-lbl">Issuing Officer</div></div>
                      <div class="sign-box"><div class="sign-line"></div><div class="sign-lbl">Date</div></div>
                    </div>

                    <div class="footer">Issued ${new Date().toLocaleString('en-LK')} &bull; File: ${d.file_no || '—'}</div>
                  </div>
                `).join('<div class="page-break"></div>');

                w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
                <title>Notices — All Discussions</title>
                <style>
                  @page { size: A4; margin: 16mm }
                  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a2e; margin: 0 }
                  .page-break { page-break-after: always }
                  .notice { border: 2px solid #1a3a6b; border-radius: 4px; padding: 22px 26px; margin-bottom: 20px }
                  .notice-hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a3a6b; padding-bottom: 12px; margin-bottom: 18px }
                  .notice-hdr h2 { margin: 0; font-size: 22px; letter-spacing: 1px; color: #1a3a6b }
                  .notice-hdr p { margin: 4px 0 0; font-size: 11px; color: #5a6478 }
                  .notice-ref { text-align: right }
                  .notice-ref .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: #94a0b4; font-weight: 700 }
                  .notice-ref .val { font-size: 14px; font-weight: 700; color: #1a3a6b }
                  .salutation { font-size: 13px; margin-bottom: 10px }
                  .body-text { font-size: 12px; line-height: 1.7; color: #1a1a2e; margin-bottom: 16px; text-align: justify }
                  .block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 10px 12px; margin-bottom: 12px }
                  .block.remind { background: #fffbeb; border-color: #fde68a }
                  .block-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: #94a0b4; font-weight: 700; margin-bottom: 4px }
                  .block-val { font-size: 12px; color: #1a1a2e; line-height: 1.5 }
                  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 16px 0 }
                  .cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 8px 10px }
                  .cell-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: #94a0b4; font-weight: 700; margin-bottom: 3px }
                  .cell-val { font-size: 12px; font-weight: 600; color: #1a1a2e }
                  .sign-row { display: flex; gap: 40px; margin: 28px 0 8px }
                  .sign-box { flex: 1 }
                  .sign-line { border-bottom: 1px solid #1a1a2e; height: 32px }
                  .sign-lbl { font-size: 10px; color: #94a0b4; margin-top: 4px }
                  .footer { margin-top: 14px; font-size: 9px; color: #94a0b4; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: right }
                </style></head><body>
                ${noticeHtml}
                </body></html>`);
                w.document.close(); setTimeout(() => w.print(), 400);
              }}
              style={{ ...btnBase, background: '#f8fafc', color: '#1a3a6b', border: '1.5px solid #cbd5e0', padding: '8px 14px', fontWeight: 600 }}
              title="Print all as Notices"
            >
              <i className="fas fa-print" style={{ fontSize: 13 }} /> Print
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 120 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 140 }} />
            </colgroup>
            <thead>
              <tr>
                {[
                  'File No',
                  'Date',
                  'Appointment',
                  'Complaint',
                  'Respond',
                  'Meeting Date & Time',
                  'Venue',
                  'Reminder',
                  'Status',
                  'Actions',
                ].map((label) => (
                  <th
                    key={label}
                    style={{
                      textAlign: 'left',
                      borderBottom: `1px solid ${theme.border}`,
                      background: '#f8fafc',
                      color: theme.text3,
                      fontSize: 11,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      padding: '12px',
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>
                    Loading discussions...
                  </td>
                </tr>
              ) : filteredDiscussions.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>
                    No discussions found
                  </td>
                </tr>
              ) : (
                filteredDiscussions.map((discussion) => (
                  <tr
                    key={discussion.id}
                    style={{ borderBottom: `1px solid ${theme.border}` }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '12px', color: theme.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={discussion.file_no}>{discussion.file_no}</td>
                    <td style={{ padding: '12px', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDate(discussion.date)}</td>
                    <td style={{ padding: '12px', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={discussion.appointment}>{discussion.appointment}</td>
                    <td style={{ padding: '12px', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={discussion.complaint}>
                      {discussion.complaint}
                    </td>
                    <td style={{ padding: '12px', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={discussion.respond}>
                      {discussion.respond}
                    </td>
                    <td style={{ padding: '12px', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{discussion.meeting_date_time || '—'}</td>
                    <td style={{ padding: '12px', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={discussion.venue}>{discussion.venue || '—'}</td>
                    <td style={{ padding: '12px', color: theme.text, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {discussion.reminder_date ? (
                        <div title={`${formatDate(discussion.reminder_date)}${discussion.reminder_notes ? ` - ${discussion.reminder_notes}` : ''}`}>
                          <div>{formatDate(discussion.reminder_date)}</div>
                          {discussion.reminder_notes && <div style={{ fontSize: 11, color: theme.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{discussion.reminder_notes}</div>}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 500,
                          background:
                            discussion.status === 'Completed'
                              ? '#d1fae5'
                              : discussion.status === 'In Progress'
                                ? '#dbeafe'
                                : discussion.status === 'Cancelled'
                                  ? '#fee2e2'
                                  : '#fef3c7',
                          color:
                            discussion.status === 'Completed'
                              ? '#065f46'
                              : discussion.status === 'In Progress'
                                ? '#0c2d6b'
                                : discussion.status === 'Cancelled'
                                  ? '#7f1d1d'
                                  : '#92400e',
                        }}
                      >
                        {discussion.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => { setViewRecord(discussion); setShowViewModal(true); }}
                          style={{ background: 'none', border: 'none', color: theme.blue, cursor: 'pointer', fontSize: 14, padding: 4 }} title="View">
                          <i className="fas fa-eye" />
                        </button>
                        <button onClick={() => { setSelectedHistoryRecord(discussion); setShowHistoryModal(true); }}
                          style={{ background: 'none', border: 'none', color: theme.text2, cursor: 'pointer', fontSize: 14, padding: 4 }} title="History">
                          <i className="fas fa-history" />
                        </button>
                        <button onClick={() => handleOpenModal(discussion)}
                          style={{ background: 'none', border: 'none', color: theme.orange, cursor: 'pointer', fontSize: 14, padding: 4 }} title="Edit">
                          <i className="fas fa-edit" />
                        </button>
                        <button onClick={() => downloadRow(discussion)}
                          style={{ background: 'none', border: 'none', color: theme.navy, cursor: 'pointer', fontSize: 14, padding: 4 }} title="Download PDF">
                          <i className="fas fa-file-pdf" />
                        </button>
                        <button onClick={() => printRow(discussion)}
                          style={{ background: 'none', border: 'none', color: theme.text2, cursor: 'pointer', fontSize: 14, padding: 4 }} title="Print Notice">
                          <i className="fas fa-print" />
                        </button>
                        <button onClick={() => handleDelete(discussion.id)}
                          style={{ background: 'none', border: 'none', color: theme.red, cursor: 'pointer', fontSize: 14, padding: 4 }} title="Delete">
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

        {/* Pagination */}
        {pageCount > 1 && (
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'center', gap: 6 }}>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              style={{ ...btnSecondary, padding: '8px 12px', fontSize: 12 }}
            >
              Prev
            </button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  ...btnSecondary,
                  padding: '8px 12px',
                  fontSize: 12,
                  background: p === page ? theme.navy : '#fff',
                  color: p === page ? '#fff' : theme.text,
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(pageCount, page + 1))}
              disabled={page === pageCount}
              style={{ ...btnSecondary, padding: '8px 12px', fontSize: 12 }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && viewRecord && (
        <div style={overlayStyle} onClick={() => setShowViewModal(false)}>
          <div style={{ ...modalStyle, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: 14, marginBottom: 18 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: theme.navy }}>Discussion Details — {viewRecord.file_no || '—'}</span>
              <button onClick={() => setShowViewModal(false)} style={closeBtnStyle}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
              <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Date</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{formatDate(viewRecord.date)}</div>
              </div>
              <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>File No</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{viewRecord.file_no || '—'}</div>
              </div>
              <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Appointment</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{viewRecord.appointment || '—'}</div>
              </div>
              <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Officer</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{viewRecord.officer || '—'}</div>
              </div>
              <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Meeting Date & Time</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{viewRecord.meeting_date_time || '—'}</div>
              </div>
              <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Venue</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{viewRecord.venue || '—'}</div>
              </div>
              <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Reminder Date</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{formatDate(viewRecord.reminder_date)}</div>
              </div>
              <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Status</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{viewRecord.status || '—'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Complaint</div>
                <div style={{ fontSize: 13, color: theme.text, whiteSpace: 'pre-wrap' }}>{viewRecord.complaint || '—'}</div>
              </div>
              <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Response / Remarks</div>
                <div style={{ fontSize: 13, color: theme.text, whiteSpace: 'pre-wrap' }}>{viewRecord.respond || '—'}</div>
              </div>
              <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Reminder Notes</div>
                <div style={{ fontSize: 13, color: theme.text, whiteSpace: 'pre-wrap' }}>{viewRecord.reminder_notes || '—'}</div>
              </div>
            </div>

            {/* Audit Logs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, borderTop: `1px solid ${theme.border}`, paddingTop: 14, marginBottom: 20 }}>
              <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Created By</div>
                <div style={{ fontSize: 12, color: theme.text }}>{viewRecord.created_by || '—'}</div>
              </div>
              <div style={{ background: theme.bg, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>Modified By</div>
                <div style={{ fontSize: 12, color: theme.text }}>{viewRecord.modified_by || '—'}</div>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleOpenModal(viewRecord);
                }}
                style={btnPrimary}
              >
                <i className="fas fa-edit" /> Edit
              </button>
              <button onClick={() => setShowViewModal(false)} style={btnSecondary}>Close</button>
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={overlayStyle} onClick={handleCloseModal}>
          <form
            onSubmit={handleSubmit}
            style={{ ...modalStyle, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: 14, marginBottom: 18 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: theme.navy }}>{editingId ? 'Edit Discussion' : 'New Discussion'}</span>
              <button type="button" onClick={handleCloseModal} style={closeBtnStyle}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>File No *</label>
                <input
                  type="text"
                  placeholder="e.g. CMA/REG/2026/001"
                  value={formData.file_no}
                  onChange={(e) => setFormData({ ...formData, file_no: e.target.value })}
                  style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Appointment / To *</label>
                <input
                  type="text"
                  placeholder="e.g. Initial Meeting or Name"
                  value={formData.appointment}
                  onChange={(e) => setFormData({ ...formData, appointment: e.target.value })}
                  style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Officer</label>
                <input
                  type="text"
                  placeholder="e.g. A. Perera"
                  value={formData.officer}
                  onChange={(e) => setFormData({ ...formData, officer: e.target.value })}
                  style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Meeting Date & Time</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-06-30 10:00"
                  value={formData.meeting_date_time}
                  onChange={(e) => setFormData({ ...formData, meeting_date_time: e.target.value })}
                  style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Venue</label>
                <input
                  type="text"
                  placeholder="e.g. Conference Room A"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Reminder Date</label>
                <input
                  type="date"
                  value={formData.reminder_date}
                  onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                  style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13 }}
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Complaint / Issue</label>
                <textarea
                  rows={3}
                  placeholder="Enter complaint details..."
                  value={formData.complaint}
                  onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
                  style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Response / Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Enter response or action taken..."
                  value={formData.respond}
                  onChange={(e) => setFormData({ ...formData, respond: e.target.value })}
                  style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Reminder Notes</label>
                <textarea
                  rows={2}
                  placeholder="Enter reminder details or follow-up tasks..."
                  value={formData.reminder_notes}
                  onChange={(e) => setFormData({ ...formData, reminder_notes: e.target.value })}
                  style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={handleCloseModal} style={btnSecondary}>Cancel</button>
              <button type="submit" style={btnPrimary}>
                <i className="fas fa-save" /> {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: 400, padding: 20 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 16, color: theme.text }}>{confirmDialog.title}</h3>
            <p style={{ margin: '0 0 20px', color: theme.text2, fontSize: 13 }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={confirmDialog.onCancel} style={btnSecondary}>Cancel</button>
              <button onClick={confirmDialog.onConfirm} style={btnDanger}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Alert Modal */}
      {reminderAlert && (
        <div style={overlayStyle} onClick={() => setReminderAlert(null)}>
          <div style={{ ...modalStyle, maxWidth: 500, padding: 22 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: theme.orange, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-exclamation-triangle" /> Reminder Alert
              </h3>
              <button onClick={() => setReminderAlert(null)} style={closeBtnStyle}>✕</button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: theme.text2 }}>
              You have {reminderAlert.length} discussion meeting(s) with active reminders due today or in the past:
            </p>
            <div style={{ maxHeight: '40vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reminderAlert.map(d => (
                <div key={d.id} style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
                    <span>{d.appointment}</span>
                    <span style={{ color: theme.orange }}>{formatDate(d.reminder_date)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: theme.text2, marginTop: 4 }}>File: {d.file_no} | Officer: {d.officer || '—'}</div>
                  {d.reminder_notes && (
                    <div style={{ fontSize: 12, color: theme.text, background: '#fef3c7', padding: '6px 10px', borderRadius: 6, marginTop: 6 }}>
                      <strong>Note:</strong> {d.reminder_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setReminderAlert(null)} style={btnPrimary}>Acknowledge</button>
            </div>
          </div>
        </div>
      )}



      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 22,
          right: 22,
          zIndex: 9999,
          background: '#fff',
          border: `1.5px solid ${theme.border}`,
          borderLeft: `4px solid ${toast.type === 'error' ? theme.red : theme.green}`,
          borderRadius: 10,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,.12)',
          minWidth: 240
        }}>
          <i
            className={`fas fa-${toast.type === 'error' ? 'times-circle' : 'check-circle'}`}
            style={{ color: toast.type === 'error' ? theme.red : theme.green, fontSize: 15 }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
