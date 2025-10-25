const sheetUrl = "https://script.google.com/macros/s/AKfycbw-fIX9VNcdsE2uK24t1jYBCl1QtnQO40CdU8sXgrlbh4Gt0bemI_dMLNERqA1hcU3d/exec";
const currentYear = 2025;
const allowedColumns = ["SL", "NAME", "DESIGNATION"];

async function loadSheetData() {
  const container = document.getElementById("committee-sections");
  const loader = document.getElementById("loader");

  try {
    const res = await fetch(sheetUrl);
    const data = await res.json();

    for (const [sheetName, rows] of Object.entries(data)) {
      const filteredRows = rows.filter(r => r["ACTIVE YEAR"] == currentYear);
      if (!filteredRows.length) continue;

      const sectionId = sheetName.toLowerCase().replace(/\s/g, "-");
      const section = document.createElement("section");

      if (sheetName.toLowerCase().includes('moderator')) {
        section.id = 'moderator';
      } else if (
        sheetName.toLowerCase().includes('executive') &&
        !sheetName.toLowerCase().includes('sub')
      ) {
        section.id = 'ec';
      } else if (
        sheetName.toLowerCase().includes('sub') ||
        sheetName.toLowerCase().includes('sub-executive') ||
        sheetName.toLowerCase().includes('sub ec')
      ) {
        section.id = 'subec';
      } else {
        section.id = sectionId;
      }

      const h2 = document.createElement("h2");
      h2.textContent = sheetName;
      section.appendChild(h2);

      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");

      // Create table header
      const headerRow = document.createElement("tr");
      allowedColumns.forEach(key => {
        const th = document.createElement("th");
        th.textContent = key;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);

      // Create rows
      filteredRows.forEach(row => {
        const tr = document.createElement("tr");
        allowedColumns.forEach(key => {
          const td = document.createElement("td");
          td.textContent = row[key] || "";
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      table.appendChild(thead);
      table.appendChild(tbody);
      section.appendChild(table);
      container.appendChild(section);

      // Add connector lines after table render
      requestAnimationFrame(() => connectRoadLines(table));
    }
  } catch (error) {
    console.error("Error loading sheet data:", error);
    container.innerHTML = "<p style='text-align:center;color:red;'>Failed to load data. Please try again later.</p>";
  } finally {
    loader.style.display = "none";
  }
}

/* ---------- DYNAMIC CONNECTOR FUNCTION ---------- */
function connectRoadLines(table) {
  const rows = table.querySelectorAll("tbody tr");

  rows.forEach((row, i) => {
    const cell = row.querySelector("td:first-child");
    const nextRow = rows[i + 1];
    if (!cell || !nextRow) return;

    // Remove old line if re-rendered
    const oldLine = cell.querySelector(".road-line");
    if (oldLine) oldLine.remove();

    const nextCell = nextRow.querySelector("td:first-child");
    const line = document.createElement("div");
    line.classList.add("road-line");
    cell.appendChild(line);

    // Calculate distance between dots
    const cellDotY = cell.getBoundingClientRect().bottom;
    const nextDotY = nextCell.getBoundingClientRect().top;
    const height = nextDotY - cellDotY;

    // Apply height dynamically
    line.style.height = `${height}px`;
  });
}

/* ---------- INIT ---------- */
loadSheetData();

/* Optional: reconnect if window resized */
window.addEventListener("resize", () => {
  document.querySelectorAll("table").forEach(connectRoadLines);
});
