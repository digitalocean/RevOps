require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();
  console.log('🌱  Seeding Meridian database...\n');
  try {
    await client.query('BEGIN');

    // Clear existing
    await client.query(`
      TRUNCATE voice_recordings, tracker_rows, trackers, log_entries,
               column_prefs, custom_fields, items, sprints,
               board_columns, projects, crew, workspaces
      RESTART IDENTITY CASCADE
    `);

    // Workspace
    const ws = await client.query(`
      INSERT INTO workspaces(name,slug,color,icon)
      VALUES('DigitalOcean RevOps','do-revops','#d4943a','⚡')
      RETURNING id
    `);
    const wsId = ws.rows[0].id;

    // Crew
    const crewData = [
      { name:'Raj Kumar',   email:'raj@digitalocean.com',   initials:'RK', color:'#6366f1', role:'Lead Developer', status:'online'  },
      { name:'Sara Kim',    email:'sara@digitalocean.com',  initials:'SK', color:'#8b5cf6', role:'Architect',       status:'online'  },
      { name:'Aman Mehta',  email:'aman@digitalocean.com',  initials:'AM', color:'#059669', role:'Developer',       status:'away'    },
      { name:'Priya Patel', email:'priya@digitalocean.com', initials:'PP', color:'#f59e0b', role:'QA Engineer',     status:'offline' },
    ];
    const crewIds = {};
    for (const c of crewData) {
      const r = await client.query(
        `INSERT INTO crew(workspace_id,name,email,initials,color,role,status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [wsId, c.name, c.email, c.initials, c.color, c.role, c.status]
      );
      crewIds[c.initials] = r.rows[0].id;
    }

    // Project
    const proj = await client.query(`
      INSERT INTO projects(workspace_id,name,description,color,status,owner_id)
      VALUES($1,'RevOps Initiative','Salesforce + AWS revenue operations platform','#6366f1','active',$2)
      RETURNING id
    `, [wsId, crewIds['RK']]);
    const projId = proj.rows[0].id;

    // Board columns
    const colData = [
      { name:'Base Camp',     slug:'backlog',   color:'#3d4a63', sort:0, done:false },
      { name:'Summit Ready',  slug:'summit',    color:'#3d9be9', sort:1, done:false },
      { name:'In Ascent',     slug:'ascent',    color:'#f59e0b', sort:2, done:false },
      { name:'At Base Camp',  slug:'basecamp',  color:'#9b7dff', sort:3, done:false },
      { name:'Peak Reached',  slug:'peak',      color:'#00c9a7', sort:4, done:true  },
    ];
    const colIds = {};
    for (const c of colData) {
      const r = await client.query(
        `INSERT INTO board_columns(project_id,name,slug,color,sort_order,is_done) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
        [projId, c.name, c.slug, c.color, c.sort, c.done]
      );
      colIds[c.slug] = r.rows[0].id;
    }

    // Sprints
    const sp13 = await client.query(`
      INSERT INTO sprints(project_id,name,goal,status,start_date,end_date,capacity)
      VALUES($1,'Sprint 13 — Foundation','Ship core routing infrastructure','completed','2026-02-15','2026-02-28',38)
      RETURNING id
    `, [projId]);

    const sp14 = await client.query(`
      INSERT INTO sprints(project_id,name,goal,status,start_date,end_date,capacity)
      VALUES($1,'Sprint 14 — Revenue Horizon','Ship Messaging for Web v2 + fix P0 routing bug','active','2026-03-01','2026-03-14',42)
      RETURNING id
    `, [projId]);
    const sp14Id = sp14.rows[0].id;

    // Work items
    const items = [
      { title:'Build agent availability detection system for Omni-Channel',          type:'task',  prio:'high',   pts:8,  col:'summit',  assignee:'RK', desc:'Apex controller + bridge LWC polling every 30 seconds for chat launcher visibility.' },
      { title:'Custom pre-chat LWC form with Omni-Channel routing flows',            type:'story', prio:'high',   pts:13, col:'ascent',  assignee:'RK', desc:'Full custom pre-chat with authenticated field capture and routing logic.' },
      { title:'SOQL query limit errors in account revenue rollup',                    type:'bug',   prio:'medium', pts:5,  col:'ascent',  assignee:'SK', desc:'Rollup trigger fires on every save — needs static caching and bulkification.' },
      { title:'Opportunity rollup batch with 5+ level hierarchy traversal',          type:'story', prio:'medium', pts:8,  col:'basecamp',assignee:'AM', desc:'Batch architecture with Needs_Count_Recalc__c flagging. Handles up to 5 levels deep.' },
      { title:'SNS topic migration for auto-panda to QA account',                    type:'task',  prio:'low',    pts:3,  col:'peak',    assignee:'PP', desc:'Avenue CLI IAM policy updates + bogiefile config with new account IDs.' },
      { title:'AgentWork trigger refactor to trigger-handler pattern',                type:'epic',  prio:'high',   pts:8,  col:'peak',    assignee:'RK', desc:'MessagingSession objects, dynamic object prefix resolution, extensive debug instrumentation.' },
      { title:'AckCopyEmailService test coverage — target 85-95%',                   type:'task',  prio:'medium', pts:5,  col:'summit',  assignee:'SK', desc:'Resolve MIXED_DML issues, hit coverage targets for AckCopyEmailService and CaseAdditionalRecipientCopyQueueable.' },
    ];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await client.query(`
        INSERT INTO items(project_id,sprint_id,type,title,description,status,column_id,priority,points,assignee_id,sort_order)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [projId, sp14Id, it.type, it.title, it.desc, it.col, colIds[it.col], it.prio, it.pts, crewIds[it.assignee], i]);
    }

    // Captain's Log entries
    const logEntries = [
      { type:'ai',    content:'Sprint 14 kickoff complete. Team aligned — SOQL fix is P0. Raj leading, Sara on architecture review. SNS blocker resolved by Priya. Velocity projecting strong at 42pt this sprint.',  author:'RK' },
      { type:'voice', content:'Follow up with Aman — Opportunity rollup review is taking longer than expected. Consider breaking into smaller sub-stories next sprint planning.',                                        author:'RK' },
      { type:'note',  content:'Custom LWC pre-chat: bridge polling at 30s works. Fixed embeddedservice_bootstrap undefined issue — deferred init pattern resolved it cleanly.',                                        author:'RK' },
    ];
    for (const e of logEntries) {
      await client.query(`
        INSERT INTO log_entries(project_id,sprint_id,author_id,entry_type,content)
        VALUES($1,$2,$3,$4,$5)
      `, [projId, sp14Id, crewIds[e.author], e.type, e.content]);
    }

    // Trackers
    const trackers = [
      {
        name:'Big Rocks', icon:'🏔',
        columns: JSON.stringify([
          {key:'initiative',label:'Initiative'},{key:'category',label:'Category'},
          {key:'priority',label:'Priority'},{key:'summit',label:'Summit?'},
          {key:'owner',label:'Owner'},{key:'status',label:'Status'},
          {key:'question',label:'Question'},{key:'description',label:'Description'}
        ])
      },
      {
        name:'OKRs', icon:'🎯',
        columns: JSON.stringify([
          {key:'objective',label:'Objective'},{key:'category',label:'Category'},
          {key:'priority',label:'Priority'},{key:'owner',label:'Owner'},
          {key:'status',label:'Status'},{key:'description',label:'Description'}
        ])
      },
      {
        name:'Risk Radar', icon:'🛡',
        columns: JSON.stringify([
          {key:'risk',label:'Risk'},{key:'likelihood',label:'Likelihood'},
          {key:'impact',label:'Impact'},{key:'owner',label:'Owner'},
          {key:'mitigation',label:'Mitigation'},{key:'status',label:'Status'}
        ])
      },
    ];

    for (let i = 0; i < trackers.length; i++) {
      const t = trackers[i];
      const tr = await client.query(`
        INSERT INTO trackers(project_id,name,icon,columns,sort_order) VALUES($1,$2,$3,$4,$5) RETURNING id
      `, [projId, t.name, t.icon, t.columns, i]);
      const trId = tr.rows[0].id;

      // Seed rows for Big Rocks tracker
      if (t.name === 'Big Rocks') {
        const rows = [
          { initiative:'Platform Migration', category:'Engineering', priority:'P0', summit:'✅', owner:'Alex Chen', status:'On Track', question:'Timeline?', description:'Migrate all services' },
          { initiative:'Mobile App Redesign', category:'Design', priority:'P1', summit:'✅', owner:'Sarah Kim', status:'At Risk', question:'Resources?', description:'Full UX overhaul' },
          { initiative:'API v3 Launch', category:'Engineering', priority:'P0', summit:'✅', owner:'Jordan Lee', status:'Complete', question:'—', description:'Next gen REST API' },
          { initiative:'Sales Portal', category:'Sales', priority:'P2', summit:'—', owner:'Marcus J.', status:'Blocked', question:'Content ready?', description:'Internal portal' },
        ];
        for (let j = 0; j < rows.length; j++) {
          await client.query(`INSERT INTO tracker_rows(tracker_id,data,sort_order) VALUES($1,$2,$3)`, [trId, JSON.stringify(rows[j]), j]);
        }
      }
    }

    // Custom fields (sample)
    await client.query(`
      INSERT INTO custom_fields(workspace_id,target,name,field_type,sort_order)
      VALUES
        ($1,'item','Client Name','text',0),
        ($1,'project','Budget','number',0),
        ($1,'sprint','Theme','text',0)
    `, [wsId]);

    await client.query('COMMIT');
    console.log('✅  Database seeded successfully!');
    console.log('   Workspace: DigitalOcean RevOps');
    console.log(`   Crew: ${crewData.length} members`);
    console.log(`   Items: ${items.length} work items in Sprint 14`);
    console.log(`   Trackers: ${trackers.length} field note trackers\n`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌  Seed failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
