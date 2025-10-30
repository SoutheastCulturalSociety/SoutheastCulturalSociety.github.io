// ========== CONFIG ==========
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyuAzmL1KX_oMF999Hotc4LCqNcFs62Ide1mdRrOgyHH9zi1lKdLvzazXDT49T9lJ0U/exec'; // <-- replace with yours

// ========== ELEMENTS ==========
const sheetSelect = document.getElementById('sheetSelect');
const refreshBtn = document.getElementById('refreshBtn');
const autoRefreshBtn = document.getElementById('autoRefreshBtn');
const candidatesList = document.getElementById('candidatesList');
const addCandidateForm = document.getElementById('addCandidateForm');
const newCandidateName = document.getElementById('newCandidateName');
const pieCtx = document.getElementById('pieChart').getContext('2d');

let chart = null;
let currentSheet = null;
let currentRows = [];
let autoRefreshInterval = null;
const AUTO_REFRESH_MS = 30000; // 30 seconds

// ========== HELPERS ==========
async function gasFetch(params) {
  const url = GAS_URL + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url, { method: 'GET', cache: 'no-cache' });
  if (!res.ok) throw new Error('Network error ' + res.status);
  return res.json();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"
  }[ch]));
}

function colorForIndex(i) {
  const hue = (i * 47) % 360;
  return `hsl(${hue} 70% 55%)`;
}

// ========== INIT ==========
async function init() {
  await loadSheets();

  sheetSelect.addEventListener('change', onSheetChange);
  refreshBtn.addEventListener('click', () => {
    if (currentSheet) loadData(currentSheet);
  });

  autoRefreshBtn.addEventListener('click', toggleAutoRefresh);

  addCandidateForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = newCandidateName.value.trim();
    if (!name) return;
    try {
      await gasFetch({ action: 'addCandidate', sheet: currentSheet, name });
      alert('Candidate proposed successfully!');
      newCandidateName.value = '';
    } catch (err) {
      alert('Error proposing candidate: ' + err.message);
    }
  });
}

// ========== LOAD SHEETS ==========
async function loadSheets() {
  try {
    const res = await gasFetch({ action: 'listSheets' });
    const sheets = res.sheets || [];
    sheetSelect.innerHTML = '';
    sheets.forEach((s, i) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      sheetSelect.appendChild(opt);
      if (i === 0) currentSheet = s;
    });
    if (currentSheet) await loadData(currentSheet);
  } catch (err) {
    console.error('loadSheets error', err);
  }
}

// ========== LOAD DATA ==========
async function onSheetChange(e) {
  currentSheet = e.target.value;
  await loadData(currentSheet);
}

async function loadData(sheetName) {
  try {
    const res = await gasFetch({ action: 'getData', sheet: sheetName });
    currentRows = res.data.rows || [];
    renderCandidates(currentRows);
    renderChart(currentRows);
  } catch (err) {
    console.error('loadData error', err);
  }
}

// ========== RENDER ==========
function renderCandidates(rows) {
  candidatesList.innerHTML = '';
  rows.forEach(row => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>${escapeHtml(row.candidate || '')}</div>
      <div>
        <span class="muted">${row.votes || 0}</span>
        <button class="voteBtn" data-row="${row.rowNum}">Vote</button>
      </div>`;
    const btn = li.querySelector('button.voteBtn');
    btn.addEventListener('click', () => onVote(row.rowNum, btn));
    candidatesList.appendChild(li);
  });
}

async function onVote(rowNum, btn) {
  try {
    btn.disabled = true;
    const res = await gasFetch({ action: 'vote', sheet: currentSheet, row: rowNum });
    if (res.success) {
      const row = currentRows.find(r => r.rowNum == rowNum);
      if (row) row.votes = res.newCount;
      renderCandidates(currentRows);
      renderChart(currentRows);
    } else {
      alert('Vote failed');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btn.disabled = false;
  }
}

function renderChart(rows) {
  const labels = rows.map(r => r.candidate || '');
  const values = rows.map(r => Number(r.votes || 0));
  const colors = labels.map((_, i) => colorForIndex(i));
  if (chart) chart.destroy();
  chart = new Chart(pieCtx, {
    type: 'pie',
    data: { labels, datasets: [{ data: values, backgroundColor: colors }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}

// ========== AUTO REFRESH ==========
function toggleAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    autoRefreshBtn.classList.remove('active');
    autoRefreshBtn.textContent = '⏱ Auto: OFF';
  } else {
    if (!currentSheet) return;
    autoRefreshInterval = setInterval(() => loadData(currentSheet), AUTO_REFRESH_MS);
    autoRefreshBtn.classList.add('active');
    autoRefreshBtn.textContent = '⏱ Auto: ON';
  }
}

init();
