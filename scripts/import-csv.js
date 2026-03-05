#!/usr/bin/env node
// ============================================================
// AgileOps CSV Importer
// ============================================================
// Usage:  node scripts/import-csv.js my-items.csv
//
// Your CSV must have these column headers (case-sensitive):
//   title, type, status, priority, points, assignee_email, description
//
// Example row:
//   Fix login bug,bug,todo,high,3,raj@company.com,Users can't log in on Safari
//
// HOW TO USE:
//   1. Make sure your backend .env is set up with DATABASE_URL
//   2. Run: node scripts/import-csv.js your-file.csv
//   3. It will ask you which project and sprint to import into
// ============================================================

require('dotenv').config({ path: require('path').join(__dirname,'../backend/.env') });
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

const csvFile = process.argv[2];
if (!csvFile) {
  console.error('\n❌  Please provide a CSV file:\n    node scripts/import-csv.js my-items.csv\n');
  process.exit(1);
}

if (!fs.existsSync(csvFile)) {
  console.error(`\n❌  File not found: ${csvFile}\n`);
  process.exit(1);
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g,''));
    return Object.fromEntries(headers.map((h,i) => [h, vals[i] || '']));
  });
}

async function run() {
  const text = fs.readFileSync(csvFile, 'utf8');
  const rows = parseCSV(text);

  console.log(`\n📂  Found ${rows.length} rows in ${path.basename(csvFile)}\n`);

  // List available projects
  const { rows: projects } = await pool.query('SELECT id, name FROM projects ORDER BY created_at');
  if (!projects.length) {
    console.error('❌  No projects found. Create a project first in the app UI.\n');
    process.exit(1);
  }

  console.log('Available projects:');
  projects.forEach((p, i) => console.log(`  ${i+1}. ${p.name}`));
  const projectId = projects[0].id; // Default to first project
  console.log(`\n→ Importing into: ${projects[0].name}\n`);

  // List available sprints
  const { rows: sprints } = await pool.query(
    'SELECT id, name FROM sprints WHERE project_id = $1 ORDER BY created_at', [projectId]
  );
  const sprintId = sprints[0]?.id || null;
  if (sprintId) console.log(`→ Adding to sprint: ${sprints[0].name}\n`);

  let created = 0, skipped = 0;

  for (const row of rows) {
    if (!row.title) { skipped++; continue; }

    const type     = ['epic','story','bug','task'].includes(row.type) ? row.type : 'task';
    const status   = ['backlog','todo','in_progress','in_review','done'].includes(row.status) ? row.status : 'backlog';
    const priority = ['critical','high','medium','low'].includes(row.priority) ? row.priority : 'medium';
    const points   = parseInt(row.points) || 1;

    // Look up assignee by email
    let assigneeId = null;
    if (row.assignee_email) {
      const { rows: members } = await pool.query(
        'SELECT id FROM team_members WHERE email = $1', [row.assignee_email]
      );
      if (members.length) assigneeId = members[0].id;
    }

    await pool.query(
      `INSERT INTO work_items (project_id, sprint_id, type, title, description, status, priority, points, assignee_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [projectId, sprintId, type, row.title, row.description||'', status, priority, points, assigneeId]
    );
    created++;
    console.log(`  ✓  ${row.title}`);
  }

  console.log(`\n✅  Done! ${created} items imported, ${skipped} skipped.\n`);
  await pool.end();
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
