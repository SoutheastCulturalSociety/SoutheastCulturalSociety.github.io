const GAS_URL = 'https://script.google.com/macros/s/AKfycbyuAzmL1KX_oMF999Hotc4LCqNcFs62Ide1mdRrOgyHH9zi1lKdLvzazXDT49T9lJ0U/exec'; // Replace

const sheetSelect = document.getElementById('sheetSelect');
const refreshBtn = document.getElementById('refreshBtn');
const autoRefreshBtn = document.getElementById('autoRefreshBtn');
const candidatesList = document.getElementById('candidatesList');
const addCandidateForm = document.getElementById('addCandidateForm');
const newCandidateName = document.getElementById('newCandidateName');
const pieCtx = document.getElementById('pieChart').getContext('2d');
const loader = document.getElementById('loader');

let chart = null;
let currentSheet = null;
let currentRows = [];
let autoRefreshInterval = null;
const AUTO_REFRESH_MS = 30000;

// ========== Loader functions ==========
function showLoader(){ loader.classList.remove('hidden'); }
function hideLoader(){ loader.classList.add('hidden'); }

// ========== Fetch Wrapper ==========
async function gasFetch(params){
  const url = GAS_URL + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url, { method:'GET', cache:'no-cache' });
  if(!res.ok) throw new Error('Network error ' + res.status);
  return res.json();
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
}

function colorForIndex(i){
  const hue = (i*47)%360;
  return `hsl(${hue} 70% 55%)`;
}

// ========== Init ==========
async function init(){
  showLoader();
  await loadSheets();
  hideLoader();

  sheetSelect.addEventListener('change', onSheetChange);
  refreshBtn.addEventListener('click', async ()=>{ if(currentSheet){ showLoader(); await loadData(currentSheet); hideLoader(); } });
  autoRefreshBtn.addEventListener('click', toggleAutoRefresh);

  addCandidateForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const btn = addCandidateForm.querySelector('button');
    const name = newCandidateName.value.trim();
    if(!name) return;
    btn.classList.add('loading');
    try{
      await gasFetch({action:'addCandidate',sheet:currentSheet,name});
      alert('Candidate proposed successfully!');
      newCandidateName.value='';
    }catch(err){
      alert('Error proposing candidate: '+err.message);
    }finally{
      btn.classList.remove('loading');
    }
  });
}

// ========== Sheets ==========
async function loadSheets(){
  try{
    const res = await gasFetch({action:'listSheets'});
    const sheets = res.sheets||[];
    sheetSelect.innerHTML='';
    sheets.forEach((s,i)=>{
      const opt=document.createElement('option');
      opt.value=s; opt.textContent=s;
      sheetSelect.appendChild(opt);
      if(i===0) currentSheet=s;
    });
    if(currentSheet) await loadData(currentSheet);
  }catch(err){ console.error(err); }
}

async function onSheetChange(e){
  currentSheet = e.target.value;
  showLoader();
  await loadData(currentSheet);
  hideLoader();
}

// ========== Data Load ==========
async function loadData(sheetName){
  try{
    const res = await gasFetch({action:'getData',sheet:sheetName});
    currentRows = res.data?.rows || [];
    renderCandidates(currentRows);
    renderChart(currentRows);
  }catch(err){ console.error(err); }
}

// ========== Render ==========
function renderCandidates(rows){
  candidatesList.innerHTML='';
  rows.forEach(row=>{
    const li=document.createElement('li');
    li.innerHTML=`
      <div>${escapeHtml(row.candidate||'')}</div>
      <div>
        <span class="muted">${row.votes||0}</span>
        <button class="voteBtn" data-row="${row.rowNum}">Vote</button>
      </div>`;
    const btn=li.querySelector('.voteBtn');
    btn.addEventListener('click',()=>onVote(row.rowNum,btn));
    candidatesList.appendChild(li);
  });
}

async function onVote(rowNum,btn){
  try{
    btn.disabled = true;
    btn.classList.add('loading');
    const res = await gasFetch({action:'vote',sheet:currentSheet,row:rowNum});
    if(res.success){
      const row = currentRows.find(r=>r.rowNum==rowNum);
      if(row) row.votes = res.newCount;
      renderCandidates(currentRows);
      renderChart(currentRows);
    }else{
      alert('Vote failed');
    }
  }catch(err){
    alert('Error: '+err.message);
  }finally{
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function renderChart(rows){
  const labels = rows.map(r=>r.candidate||'');
  const values = rows.map(r=>Number(r.votes||0));
  const colors = labels.map((_,i)=>colorForIndex(i));
  if(chart) chart.destroy();
  chart = new Chart(pieCtx,{
    type:'pie',
    data:{labels,datasets:[{data:values,backgroundColor:colors}]},
    options:{responsive:true,plugins:{legend:{position:'bottom'}}}
  });
}

// ========== Auto Refresh ==========
function toggleAutoRefresh(){
  if(autoRefreshInterval){
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    autoRefreshBtn.classList.remove('active');
    autoRefreshBtn.textContent='⏱ Auto: OFF';
  }else{
    if(!currentSheet) return;
    autoRefreshInterval = setInterval(async ()=>{
      showLoader();
      await loadData(currentSheet);
      hideLoader();
    }, AUTO_REFRESH_MS);
    autoRefreshBtn.classList.add('active');
    autoRefreshBtn.textContent='⏱ Auto: ON';
  }
}

init();
