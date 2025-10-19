# SoutheastCulturalSociety.github.io AppScript Code Documentation

This document contains the Google Apps Script code and associated links used to power the Southeast Cultural Society website's dynamic features, including the gallery, notices, and member/committee data retrieval.

---
1. Gallery AppScript Code


This script handles the full synchronization of images from Google Drive to the GitHub repository, managing uploads, skipping existing files, and deleting removed ones.

```javascript
/**
 * Google Drive → GitHub full sync
 * Uploads new files, skips existing, deletes removed.
 */

// ========== CONFIGURATION ========== //
const GITHUB_TOKEN = "ghp_iDvHYio5RUTo3UVyYH7gSIuvGEDFoM0tPSy*C"; // Replace this
const GITHUB_REPO = "SoutheastCulturalSociety/SoutheastCulturalSociety.github.io"; // username/repo
const GITHUB_BRANCH = "main"; // Branch
const GITHUB_FOLDER = "assets/gallery"; // Target folder in repo
const DRIVE_FOLDER_ID = "18F5Vie2EWnBMY6jR0_lmCIiJu3XuoUgM"; // Your Drive folder ID

// ========== MAIN FUNCTION ========== //
function doGet() {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const filesInDrive = {};
  const filesIterator = folder.getFiles();

  // Collect Drive files
  while (filesIterator.hasNext()) {
    const file = filesIterator.next();
    filesInDrive[file.getName()] = file;
  }

  // Get GitHub files in target folder
  const githubFiles = listGitHubFiles(GITHUB_FOLDER);
  const githubFileNames = githubFiles.map(f => f.name);

  // --- UPLOAD NEW FILES ---
  let uploadedCount = 0;
  for (const fileName in filesInDrive) {
    if (githubFileNames.includes(fileName)) {
      // Already exists in GitHub, skip
      continue;
    }
    const file = filesInDrive[fileName];
    const fileBlob = file.getBlob();
    const contentBase64 = Utilities.base64Encode(fileBlob.getBytes());

    const success = commitFileToGitHub(`${GITHUB_FOLDER}/${fileName}`, contentBase64, fileName, null);
    if (success) uploadedCount++;
  }

  // --- DELETE REMOVED FILES ---
  let deletedCount = 0;
  githubFiles.forEach(f => {
    if (!filesInDrive[f.name]) {
      const success = deleteGitHubFile(`${GITHUB_FOLDER}/${f.name}`, f.sha, f.name);
      if (success) deletedCount++;
    }
  });

  const msg = `✅ Sync complete!\nUploaded: ${uploadedCount}\nDeleted: ${deletedCount}\nSkipped: ${githubFiles.length - deletedCount}`;
  Logger.log(msg);
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}

// ========== HELPER: List files in GitHub folder ==========
function listGitHubFiles(folderPath) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${folderPath}?ref=${GITHUB_BRANCH}`;
  const options = {
    method: "get",
    headers: {
      Authorization: "token " + GITHUB_TOKEN,
      "User-Agent": "Google-Apps-Script"
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() === 200) {
    const data = JSON.parse(response.getContentText());
    // Return array of {name, sha, path}
    return data.map(f => ({ name: f.name, sha: f.sha, path: f.path }));
  }
  return [];
}

// ========== HELPER: Commit file to GitHub ==========
function commitFileToGitHub(path, contentBase64, fileName, sha) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  const payload = {
    message: sha ? `Update ${fileName}` : `Add ${fileName}`,
    content: contentBase64,
    branch: GITHUB_BRANCH
  };
  if (sha) payload.sha = sha;

  const options = {
    method: "put",
    headers: {
      Authorization: "token " + GITHUB_TOKEN,
      "User-Agent": "Google-Apps-Script"
    },
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  if (code === 201 || code === 200) {
    Logger.log(`${fileName} uploaded successfully!`);
    return true;
  } else {
    Logger.log(`❌ Failed to upload ${fileName}: ${response.getContentText()}`);
    return false;
  }
}

// ========== HELPER: Delete file from GitHub ==========
function deleteGitHubFile(path, sha, fileName) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  const payload = {
    message: `Delete ${fileName}`,
    sha: sha,
    branch: GITHUB_BRANCH
  };

  const options = {
    method: "delete",
    headers: {
      Authorization: "token " + GITHUB_TOKEN,
      "User-Agent": "Google-Apps-Script"
    },
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  if (code === 200) {
    Logger.log(`${fileName} deleted from GitHub`);
    return true;
  } else {
    Logger.log(`❌ Failed to delete ${fileName}: ${response.getContentText()}`);
    return false;
  }
}
---

Note 1: When this script runs, the GitHub assets/gallery folder will be synced to match the contents of the Google Drive gallery folder (used for image upload and deletion).
Note 2: To upload images, place them in the Google Drive gallery folder, then visit the Gallery Input Confirm Button Link to trigger the script. The uploaded images will then be published to the website.
Google Drive Gallery Folder Link: https://drive.google.com/drive/folders/18F5Vie2EWnBMY6jR0_lmCIiJu3XuoUgM
Gallery Input Confirm Button Link: https://script.google.com/macros/s/AKfycby-S3MDeKaxFHSJoStz21cMuH3quoPXKGOLwCBfzGlEEqGL6hQC3251IfRxD4EV0cpx/exec

---
2. Notice AppScript Code
This script serves the notice data from the Google Sheet as a JSON API endpoint.
JavaScript
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Safely get sheet name
  const sheetName = (e && e.parameter && e.parameter.sheet) || ss.getSheets()[0].getName();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({error: "Sheet not found"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const headers = data.shift();

  const result = data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
---

Note: Input the required data (Notice Headline, Notice Details, Registration Link (if any)) into the Google Sheet. The notices will then be automatically published on the website.
Notice Google Sheet Link: https://docs.google.com/spreadsheets/d/1gPpOM7Uxvr8i4zBsiZpk8VA4dkCDGZZKAWbrzRvlv7c

---
3. Member AppScript Code
This script handles member data retrieval, allowing search by Student ID or listing members by Recruitment batch and current year.
JavaScript
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const studentIdRaw = (e.parameter.id || "").toString().trim().toUpperCase();
    const recruitmentId = (e.parameter.recruitment || "").toString().trim();

    const sheets = ss.getSheets();

    // -------------------
    // 1️⃣ If searching by Student ID → keep existing functionality
    if (studentIdRaw) {
      let studentData = null;
      let activeYears = [];

      sheets.forEach(sheet => {
        const data = sheet.getDataRange().getValues();
        if (data.length < 2) return;

        const headers = data[0].map(h => h.toString().trim());

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const rowId = row[headers.indexOf("STUDENT ID")]?.toString().trim().toUpperCase();
          if (rowId === studentIdRaw) {
            if (!studentData) {
              studentData = {};
              headers.forEach((h, idx) => {
                const key = h.replace(/\s+/g, " ").trim();
                if (key !== "Active Year" && key !== "SL") {
                  studentData[key] = row[idx];
                }
              });
            }
            const year = row[headers.indexOf("Active Year")] || row[headers.indexOf("ACTIVE YEAR")];
            if (year && !activeYears.includes(year)) activeYears.push(year);
          }
        }
      });

      if (!studentData) return sendJSON({ success: false, message: "Student ID not found." });

      studentData["Active Year"] = activeYears.sort().join(", ");
      return sendJSON({ success: true, data: studentData });
    }

    // -------------------
    // 2️⃣ If searching by Recruitment → return list of students for that Recruitment
    if (recruitmentId) {
      let students = [];
      sheets.forEach(sheet => {
        const data = sheet.getDataRange().getValues();
        if (data.length < 2) return;

        const headers = data[0].map(h => h.toString().trim());
        const recruitmentIndex = headers.findIndex(h => h.toUpperCase() === "RECRUITMENT");
        const nameIndex = headers.findIndex(h => h.toUpperCase() === "NAME");
        const codedIdIndex = headers.findIndex(h => h.toUpperCase() === "CODED STUDENT ID"); // Updated
        const yearIndex = headers.findIndex(h => h.toUpperCase() === "ACTIVE YEAR");

        if (recruitmentIndex === -1 || nameIndex === -1 || codedIdIndex === -1) return;

        const currentYear = new Date().getFullYear().toString(); // Use current year
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const activeYear = row[yearIndex]?.toString().trim();
          const recruit = row[recruitmentIndex]?.toString().trim();
          if (recruit === recruitmentId && activeYear === currentYear) {
            students.push({
              Name: row[nameIndex],
              "Coded Student ID": row[codedIdIndex] // Updated
            });
          }
        }
      });
      return sendJSON({ success: true, data: students });
    }

    // -------------------
    // 3️⃣ No parameters → return all unique Recruitment IDs for current active year
    let uniqueRecruitments = new Set();
    sheets.forEach(sheet => {
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) return;

      const headers = data[0].map(h => h.toString().trim());
      const recruitmentIndex = headers.findIndex(h => h.toUpperCase() === "RECRUITMENT");
      const yearIndex = headers.findIndex(h => h.toUpperCase() === "ACTIVE YEAR");

      if (recruitmentIndex === -1 || yearIndex === -1) return;

      const currentYear = new Date().getFullYear().toString();
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const activeYear = row[yearIndex]?.toString().trim();
        const recruit = row[recruitmentIndex]?.toString().trim();
        if (recruit && activeYear === currentYear) {
          uniqueRecruitments.add(recruit);
        }
      }
    });

    return sendJSON({ success: true, data: Array.from(uniqueRecruitments).sort() });

  } catch (err) {
    return sendJSON({ success: false, message: err.message });
  }
}

function sendJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
             .setMimeType(ContentService.MimeType.JSON);
}
---

Note: Input data into the MEMBER, SUBEC, and EC sheets within the member Google Sheet to archive data on the server.
Member Google Sheet Link: https://docs.google.com/spreadsheets/d/1W9c-fiNp1Pd4f9Ur3QmWGnZodYWj1hoASCVa_5UNVnQ


---
4. Committee AppScript Code
This script retrieves and filters committee member data for a specific year from the Google Sheet.
JavaScript
function doGet() {
  const ss = SpreadsheetApp.openById("1P4Ru7PTuf3apwg3IKJ43u_F1N87oNblqGakQjvrmNJ8");
  const sheets = ss.getSheets();
  const currentYear = 2025;
  let result = {};

  sheets.forEach(sheet => {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const yearIndex = headers.indexOf("ACTIVE YEAR");

    // Filter rows for the current year
    const filteredRows = data.slice(1).filter(row => row[yearIndex] == currentYear);

    result[sheet.getName()] = filteredRows.map(row => {
      let obj = {};
      headers.forEach((header, i) => obj[header] = row[i]);
      return obj;
    });
  });

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
---

Note: Input data for MODERATOR, EXECUTIVE COMMITTEE (EC), and SUB EXECUTIVE COMMITTEE (SUB EC) on the committee Google sheet to publish the committee lists on the website.
Committee Google Sheet Link: https://docs.google.com/spreadsheets/d/1P4Ru7PTuf3apwg3IKJ43u_F1N87oNblqGakQjvrmNJ8

