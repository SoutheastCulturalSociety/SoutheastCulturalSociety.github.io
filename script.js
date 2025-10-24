// ---------- PARTICLE JS ----------
const canvas = document.getElementById("particle-bg");
const ctx = canvas.getContext("2d");
let particlesArray;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 5 + 2;
    this.speedY = Math.random() * 1 + 0.2;
    this.speedX = Math.random() * 0.5 - 0.25;
    this.opacity = Math.random() * 0.5 + 0.3;
    this.color = `rgba(255, ${Math.floor(Math.random()*200+100)}, ${Math.floor(Math.random()*100)}, ${this.opacity})`;
  }
  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    if(this.y > canvas.height) this.y = -this.size;
    if(this.x > canvas.width) this.x = 0;
    if(this.x < 0) this.x = canvas.width;
  }
  draw(){
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles(){
  particlesArray = [];
  const num = Math.floor(window.innerWidth / 8);
  for(let i = 0; i < num; i++) particlesArray.push(new Particle());
}
initParticles();

function animateParticles(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for(let p of particlesArray){ p.update(); p.draw(); }
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ---------- GALLERY ----------
const galleryTop = document.getElementById('gallery-track-top');
const galleryBottom = document.getElementById('gallery-track-bottom');
const modalGalleryGrid = document.getElementById('modalGalleryGrid');
const modal = document.getElementById('galleryModal');
const openBtn = document.getElementById('openGallery');
const closeBtn = document.getElementById('closeGallery');
let allImages = [];

fetch('gallery.json').then(res => res.json()).then(images => {
  allImages = images;
  const half = Math.ceil(images.length / 2);
  const topImages = images.slice(0, half);
  const bottomImages = images.slice(half);
  function populateRow(track, imgs){
    const imgWidth = 240;
    const needed = Math.ceil(window.innerWidth / imgWidth) + imgs.length;
    for(let i = 0; i < needed; i++){
      const img = document.createElement('img');
      img.src = imgs[i % imgs.length];
      track.appendChild(img);
    }
  }
  populateRow(galleryTop, topImages);
  populateRow(galleryBottom, bottomImages.length ? bottomImages : topImages);
}).catch(err => console.error('Error loading gallery:', err));

openBtn.addEventListener('click', e => {
  e.preventDefault();
  modal.classList.add('active');
  modalGalleryGrid.innerHTML = '';
  allImages.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    modalGalleryGrid.appendChild(img);
  });
});

closeBtn.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('active'); });

// ---------- NOTICES ----------
const apiURL = 'https://script.google.com/macros/s/AKfycbxzp7y2TSisFBVR1OMFhWliup9muwm_akchMv8LlPio2mc8wbWaB3mmeGhy1qN6W2Filg/exec';
const newsWheelDiv = document.getElementById('news-wheel');
const noticeSection = document.getElementById('upcoming-events');

fetch(apiURL).then(res => res.json()).then(data => {
  const headlines = data.map(n => n['Notice Headline']).join(' — ');
  newsWheelDiv.textContent = headlines || 'No notices currently.';
  noticeSection.innerHTML = '';
  if(data.length === 0){
    noticeSection.innerHTML = '<p>No upcoming events.</p>';
  }else{
    data.forEach(n => {
      const card = document.createElement('div');
      card.classList.add('notice-card');
      card.innerHTML = `<h3>${n['Notice Headline'] || 'No title'}</h3><p>${n['Notice Details'] || ''}</p>${n['Registration Link(if any)'] ? `<a href="${n['Registration Link(if any)']}" target="_blank">Register</a>` : ''}`;
      noticeSection.appendChild(card);
    });
  }
}).catch(err => { console.error('Failed to load notices:', err); newsWheelDiv.textContent = 'Failed to load notices.'; noticeSection.innerHTML = '<p>Failed to load notices.</p>'; });

// ---------- RECRUITMENT ----------
const recruitmentAPI = 'https://script.google.com/macros/s/AKfycbxEUpzVF_D9NAFVIfjfetKVwQa5jw26P9KJ46NkYgJZD86wpN_CrTM1EzS92o7P9A4Q/exec';
const buttonsDiv = document.getElementById('recruitment-buttons');
const listDiv = document.getElementById('recruitment-list');
const closeRecruitBtn = document.querySelector('.close-recruitment-btn');

fetch(recruitmentAPI).then(res => res.json()).then(data => {
  buttonsDiv.innerHTML = '';
  if(data.success && data.data.length){
    data.data.forEach(rec => {
      const btn = document.createElement('button');
      btn.className = 'recruitment-btn';
      btn.textContent = rec;
      btn.addEventListener('click', () => {
        loadRecruitmentList(rec);
        closeRecruitBtn.style.display = 'inline-block'; // Show close button
      });
      buttonsDiv.appendChild(btn);
    });
  }else{
    buttonsDiv.innerHTML = '<p style="color:maroon;">No recruitment data available.</p>';
  }
}).catch(err => { console.error('Failed to load recruitment buttons:', err); buttonsDiv.innerHTML = '<p style="color:maroon;">Failed to load recruitment buttons.</p>'; });

function loadRecruitmentList(recruitmentId){
  const oldRows = listDiv.querySelectorAll('.recruitment-item, .recruitment-list-msg');
  oldRows.forEach(r => r.remove());
  const loadingRow = document.createElement('p');
  loadingRow.style.textAlign = 'center';
  loadingRow.style.color = 'maroon';
  loadingRow.textContent = 'Loading...';
  loadingRow.classList.add('recruitment-list-msg');
  listDiv.appendChild(loadingRow);

  fetch(`${recruitmentAPI}?recruitment=${recruitmentId}`).then(res => res.json()).then(data => {
    loadingRow.remove();
    if(data.success && data.data.length){
      data.data.forEach(stu => {
        const div = document.createElement('div');
        div.className = 'recruitment-item';
        div.innerHTML = `<div>${stu.Name}</div><div>${stu["Coded Student ID"]}</div>`;
        listDiv.appendChild(div);
      });
    }else{
      const msg = document.createElement('p');
      msg.style.textAlign = 'center';
      msg.style.color = 'maroon';
      msg.classList.add('recruitment-list-msg');
      msg.textContent = 'No students found for this recruitment.';
      listDiv.appendChild(msg);
    }
  }).catch(err => {
    console.error('Failed to load recruitment list:', err);
    loadingRow.remove();
    const msg = document.createElement('p');
    msg.style.textAlign = 'center';
    msg.style.color = 'maroon';
    msg.classList.add('recruitment-list-msg');
    msg.textContent = 'Failed to load students.';
    listDiv.appendChild(msg);
  });
}

closeRecruitBtn.addEventListener('click', () => {
  const studentRows = listDiv.querySelectorAll('.recruitment-item, .recruitment-list-msg');
  studentRows.forEach(r => r.remove());
  closeRecruitBtn.style.display = 'none'; // Hide button again
});