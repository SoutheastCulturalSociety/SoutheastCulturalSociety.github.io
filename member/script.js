let currentData = null;

document.getElementById('studentId').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    fetchID();
  }
});

async function fetchID() {
  const studentId = document.getElementById('studentId').value.trim();
  if (!studentId) return alert("Please enter your Student ID.");

  const loader = document.getElementById('loader');
  loader.style.display = 'block';
  document.getElementById('downloadBtn').style.display = 'none';
  document.getElementById('regenBtn').style.display = 'none';
  document.getElementById('preview').style.display = 'none';
  document.getElementById('generateBtn').style.display = 'none';

  const apiUrl = "https://script.google.com/macros/s/AKfycbxEUpzVF_D9NAFVIfjfetKVwQa5jw26P9KJ46NkYgJZD86wpN_CrTM1EzS92o7P9A4Q/exec?id=" + encodeURIComponent(studentId);

  try {
    const res = await fetch(apiUrl);
    const result = await res.json();
    loader.style.display = 'none';

    if (!result.success) {
      document.getElementById('generateBtn').style.display = 'inline-block';
      return alert(result.message || "Student ID not found.");
    }

    currentData = result.data;

    const previewInfo = document.getElementById('previewInfo');
    previewInfo.innerHTML = `
      <strong>Name:</strong> ${currentData.NAME}<br>
      <strong>Student ID:</strong> ${currentData["STUDENT ID"]}<br>
      <strong>Department & Batch:</strong> ${currentData.DEPARTMENT} - ${currentData.BATCH}<br>
      <strong>Active Year:</strong> ${currentData["Active Year"]}
    `;

    document.getElementById('preview').style.display = 'block';
    document.getElementById('downloadBtn').style.display = 'inline-block';
    document.getElementById('regenBtn').style.display = 'inline-block';
    document.getElementById('studentId').style.display = 'none';

  } catch (error) {
    loader.style.display = 'none';
    document.getElementById('generateBtn').style.display = 'inline-block';
    console.error(error);
    alert("Error fetching data. Please try again later.");
  }
}

function toDataURL(url, callback) {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.src = url;
  img.onload = function() {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const dataURL = canvas.toDataURL('image/png');
    callback(dataURL, img.width, img.height);
  };
}

function downloadID() {
  if (!currentData) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 54]
  });

  doc.setFillColor(255, 248, 240);
  doc.rect(0, 0, 85.6, 54, 'F');

  toDataURL('../assets/logo.png', function(logoBase64, w, h) {
    const maxWidth = 13;
    const aspect = h / w;
    const finalHeight = maxWidth * aspect;
    const xPos = 85.6 - maxWidth - 5;
    const yPos = 5;

    doc.addImage(logoBase64, 'PNG', xPos, yPos, maxWidth, finalHeight);

    let y = 22;
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`Name: ${currentData.NAME}`, 6, y); y += 6;
    doc.text(`Student ID: ${currentData["STUDENT ID"]}`, 6, y); y += 6;
    doc.text(`Dept & Batch: ${currentData.DEPARTMENT} - ${currentData.BATCH}`, 6, y); y += 6;
    doc.text(`Active Year: ${currentData["Active Year"]}`, 6, y);

    doc.save(`${currentData.NAME}_SCS_ID.pdf`);
  });
}

function reGenerate() {
  document.getElementById('studentId').value = '';
  document.getElementById('studentId').style.display = 'inline-block';
  document.getElementById('preview').style.display = 'none';
  document.getElementById('downloadBtn').style.display = 'none';
  document.getElementById('regenBtn').style.display = 'none';
  document.getElementById('generateBtn').style.display = 'inline-block';
  currentData = null;
  document.getElementById('studentId').focus();
}