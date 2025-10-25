const sheetUrl = "https://script.google.com/macros/s/AKfycbw-fIX9VNcdsE2uK24t1jYBCl1QtnQO40CdU8sXgrlbh4Gt0bemI_dMLNERqA1hcU3d/exec";
const currentYear = 2025; // Filter only this year
const allowedColumns = ["SL", "NAME", "DESIGNATION"]; // Only show these columns

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

      // Updated ID mapping logic (based on your HTML anchors)
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

      // Create table header (only allowed columns)
      const headerRow = document.createElement("tr");
      allowedColumns.forEach(key => {
        const th = document.createElement("th");
        th.textContent = key;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);

      // Create table rows
      filteredRows.forEach(row => {
        const tr = document.createElement("tr");
        allowedColumns.forEach(key => {
          const td = document.createElement("td");
          td.textContent = row[key] || ""; // blank if missing
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      table.appendChild(thead);
      table.appendChild(tbody);
      section.appendChild(table);
      container.appendChild(section);
    }
  } catch (error) {
    console.error("Error loading sheet data:", error);
    container.innerHTML = "<p style='text-align:center;color:red;'>Failed to load data. Please try again later.</p>";
  } finally {
    loader.style.display = "none"; // Hide loader after data is loaded
  }
}

loadSheetData();
