import Logger from './utils/logger.js';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

async function handleResponse(response) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'API request failed');
  }
  return response.json();
}

async function fetchWithRetry(url, options, { retries = 1 } = {}) {
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      const method = options?.method || 'GET';
      const endpoint = url.replace(API_BASE, '').split('?')[0];
      
      // Log API call
      if (res.ok) {
        Logger.logAPICall(method, endpoint, res.status);
      } else {
        Logger.logAPICCallError(method, endpoint, new Error(`HTTP ${res.status}`));
      }
      
      return res;
    } catch (err) {
      lastErr = err;
      // retry only on network-level failures (fetch throws), not on HTTP errors
      if (attempt === retries) {
        Logger.logAPICCallError('FETCH', url, err);
        throw new Error(
          `Network error while calling: ${url}. Original error: ${err?.message || String(err)}`
        );
      }
    }
  }

  throw lastErr;
}

export async function fetchComposers() {
  const response = await fetch(`${API_BASE}/composers`);
  return handleResponse(response);
}

export async function fetchComposerById(id) {
  const response = await fetch(`${API_BASE}/composers/${id}`);
  return handleResponse(response);
}

export async function createComposer(composer) {
  const response = await fetch(`${API_BASE}/composers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(composer),
  });
  return handleResponse(response);
}

export async function updateComposer(id, composer) {
  const response = await fetch(`${API_BASE}/composers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(composer),
  });
  return handleResponse(response);
}

export async function deleteComposer(id) {
  const response = await fetch(`${API_BASE}/composers/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

// ========== C Files API ==========
export async function fetchCfiles() {
  const response = await fetch(`${API_BASE}/cfiles`);
  return handleResponse(response);
}

export async function fetchCfilesAll() {
  const response = await fetch(`${API_BASE}/cfiles?limit=999999`);
  return handleResponse(response);
}

export async function createCfile(cfile) {
  const response = await fetch(`${API_BASE}/cfiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfile),
  });
  return handleResponse(response);
}

export async function deleteCfile(id) {
  const response = await fetch(`${API_BASE}/cfiles/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

// ========== COMPLAINTS API ==========
export async function fetchComplaints(status = '', page = 1, limit = 1000) {
  const url = new URL(`${API_BASE}/complaints`);
  if (status) url.searchParams.append('status', status);
  url.searchParams.append('page', page);
  url.searchParams.append('limit', limit);
  const response = await fetch(url.toString());
  return handleResponse(response);
}

export async function fetchComplaintById(id) {
  const response = await fetch(`${API_BASE}/complaints/${id}`);
  return handleResponse(response);
}

export async function createComplaint(complaint) {
  const response = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(complaint),
  });
  return handleResponse(response);
}

export async function updateComplaintStatus(id, status) {
  const response = await fetch(`${API_BASE}/complaints/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse(response);
}

export async function assignComplaintToDGM(id, assigned_to_dgm) {
  const response = await fetch(`${API_BASE}/complaints/${id}/assign-dgm`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assigned_to_dgm }),
  });
  return handleResponse(response);
}

export async function approveDGM(id, dgm_approval_status, dgm_notes) {
  const response = await fetch(`${API_BASE}/complaints/${id}/dgm-approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dgm_approval_status, dgm_notes }),
  });
  return handleResponse(response);
}

export async function resolveComplaint(id, resolution_notes) {
  const response = await fetch(`${API_BASE}/complaints/${id}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolution_notes }),
  });
  return handleResponse(response);
}

export async function fetchComplaintSummaryStats() {
  const response = await fetch(`${API_BASE}/complaints/stats/summary`);
  return handleResponse(response);
}

export async function fetchPendingComplaints(limit = 5) {
  const response = await fetch(`${API_BASE}/complaints/dashboard/pending?limit=${limit}`);
  return handleResponse(response);
}

export async function fetchPendingCfiles(limit = 5) {
  const response = await fetch(`${API_BASE}/cfiles/dashboard/pending?limit=${limit}`);
  return handleResponse(response);
}

// ========== MC API ==========
export async function fetchMCs() {
  const response = await fetch(`${API_BASE}/mc`);
  return handleResponse(response);
}

export async function fetchMCsFiltered({
  year,
  category,
  status,
  municipality,
  page = 1,
  limit = 20,
  q,
} = {}) {
  const url = new URL(`${API_BASE}/mc`);
  if (status) url.searchParams.append('status', status);
  if (year) url.searchParams.append('year', year);
  if (category) url.searchParams.append('category', category);
  if (municipality) url.searchParams.append('municipality', municipality);
  if (page) url.searchParams.append('page', page);
  if (limit) url.searchParams.append('limit', limit);
  if (q) url.searchParams.append('q', q);

  const response = await fetch(url.toString());
  return handleResponse(response);
}

export async function fetchMCsAll() {
  const url = new URL(`${API_BASE}/mc`);
  url.searchParams.append('limit', 999999);
  const response = await fetch(url.toString());
  return handleResponse(response);
}



export async function createMC(mc) {
  const response = await fetch(`${API_BASE}/mc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mc),
  });
  return handleResponse(response);
}

export async function importMCsBulk(records) {
  const response = await fetch(`${API_BASE}/mc/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(records),
  });
  return handleResponse(response);
}

export async function importMComsBulk(records) {
  const response = await fetch(`${API_BASE}/mcom/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(records),
  });
  return handleResponse(response);
}

export async function deleteMComsBulk(fileNos = []) {
  const response = await fetch(`${API_BASE}/mcom/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_nos: fileNos }),
  });
  return handleResponse(response);
}

// ========== M.COM API ==========
export async function fetchMComs({ year, municipality, status, page, limit } = {}) {
  const url = new URL(`${API_BASE}/mcom`);
  if (year) url.searchParams.append('year', year);
  if (municipality) url.searchParams.append('municipality', municipality);
  if (status) url.searchParams.append('status', status);
  if (page) url.searchParams.append('page', page);
  if (limit) url.searchParams.append('limit', limit);

  const response = await fetch(url.toString());
  return handleResponse(response);
}

export async function fetchMComsAll() {
  const url = new URL(`${API_BASE}/mcom`);
  url.searchParams.append('limit', 999999);
  const response = await fetch(url.toString());
  return handleResponse(response);
}


export async function fetchMComsFiltered(filters = {}) {
  return fetchMComs(filters);
}


// ========== DASHBOARD API ==========
export async function fetchDashboardStats() {
  const response = await fetch(`${API_BASE}/dashboard/stats`);
  return handleResponse(response);
}

// ========== REPORTS API ==========
export async function generateComplaintReport(start_date, end_date, status) {
  const response = await fetch(`${API_BASE}/reports/generate/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_date, end_date, status }),
  });
  return handleResponse(response);
}

export async function exportData(type) {
  const response = await fetch(`${API_BASE}/reports/export/${type}`);
  const data = await handleResponse(response);
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2)));
  element.setAttribute('download', `${type}-${new Date().toISOString().split('T')[0]}.json`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// ========== DISCUSSIONS API ==========
export async function fetchDiscussions(page = 1, limit = 20, search = '') {
  const url = new URL(`${API_BASE}/discussion`);
  url.searchParams.append('page', page);
  url.searchParams.append('pageSize', limit);
  if (search) url.searchParams.append('search', search);
  const response = await fetch(url.toString());
  return handleResponse(response);
}

export async function createDiscussion(discussion) {
  const response = await fetch(`${API_BASE}/discussion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discussion),
  });
  return handleResponse(response);
}

export async function updateDiscussion(id, discussion) {
  const response = await fetch(`${API_BASE}/discussion/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discussion),
  });
  return handleResponse(response);
}

export async function deleteDiscussion(id) {
  const response = await fetch(`${API_BASE}/discussion/${id}`, {
    method: 'DELETE',
  });
  if (response.status === 204) return { success: true };
  return handleResponse(response);
}

export async function deleteAllDiscussions() {
  const response = await fetch(`${API_BASE}/discussion`, {
    method: 'DELETE',
  });
  if (response.status === 204) return { success: true };
  return handleResponse(response);
}

