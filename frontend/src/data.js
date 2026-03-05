export const USERS = [
  { id:"u1", name:"Raj K.",   initials:"RK", hex:"#3b82f6", role:"Lead Dev"     },
  { id:"u2", name:"Sara K.",  initials:"SK", hex:"#a78bfa", role:"Product"       },
  { id:"u3", name:"Aman M.",  initials:"AM", hex:"#34d399", role:"Backend Eng"   },
  { id:"u4", name:"Priya P.", initials:"PP", hex:"#fb923c", role:"QA Engineer"   },
];

export const LABELS = [
  { id:"l1", name:"Salesforce",    hex:"#3b82f6" },
  { id:"l2", name:"LWC",           hex:"#a78bfa" },
  { id:"l3", name:"Apex",          hex:"#34d399" },
  { id:"l4", name:"P0 Bug",        hex:"#f87171" },
  { id:"l5", name:"Omni-Channel",  hex:"#fbbf24" },
];

export const COLUMNS = [
  { id:"backlog",     label:"Backlog",     hex:"#475569", accent:"rgba(71,85,105,0.2)"  },
  { id:"todo",        label:"To Do",       hex:"#94a3b8", accent:"rgba(148,163,184,0.2)"},
  { id:"in_progress", label:"In Progress", hex:"#3b82f6", accent:"rgba(59,130,246,0.2)" },
  { id:"in_review",   label:"In Review",   hex:"#f0a500", accent:"rgba(240,165,0,0.2)"  },
  { id:"done",        label:"Done",        hex:"#10b981", accent:"rgba(16,185,129,0.2)" },
];

export const TYPE_META = {
  epic:  { label:"Epic",  icon:"◈", hex:"#a78bfa" },
  story: { label:"Story", icon:"◉", hex:"#3b82f6" },
  bug:   { label:"Bug",   icon:"⬡", hex:"#f87171" },
  task:  { label:"Task",  icon:"◻", hex:"#34d399" },
};

export const PRIO_META = {
  critical: { label:"Critical", hex:"#f87171", icon:"▲" },
  high:     { label:"High",     hex:"#fb923c", icon:"↑" },
  medium:   { label:"Medium",   hex:"#fbbf24", icon:"→" },
  low:      { label:"Low",      hex:"#34d399", icon:"↓" },
};

export const SPRINT_START = new Date("2026-03-01");
export const mkId = () => Math.random().toString(36).slice(2,9);

export const SEED_ITEMS = [
  {
    id:"i1", type:"epic", title:"Messaging for Web v2", status:"in_progress", priority:"high", points:13,
    assignee:"u1", labels:["l1"], startDate:"2026-03-01", endDate:"2026-03-12",
    description:"Full migration from legacy Embedded Service Chat to Messaging for Web — agent detection, pre-chat forms, Omni-Channel routing, and DO-branded launcher.",
    criteria:[{id:"c1",text:"Pre-chat LWC captures all required fields",done:true},{id:"c2",text:"Omni-Channel routing configured",done:true},{id:"c3",text:"Agent availability detection live",done:false}],
    comments:[{id:"cm1",user:"u2",text:"Routing setup looks solid — tested with Tier 1 agents. Tier 2 queue still pending.",ts:"2026-03-02T10:00:00Z"}],
    approvers:[{id:"a1",user:"u2",status:"approved"}], blockers:[]
  },
  {
    id:"i2", type:"story", title:"Agent availability detection LWC", status:"in_progress", priority:"high", points:8,
    assignee:"u1", labels:["l1","l2"], startDate:"2026-03-01", endDate:"2026-03-07",
    description:"LWC bridge polls Apex every 30s to surface online agent count. DOM observer hides launcher when zero agents available.",
    criteria:[{id:"c4",text:"Apex controller exposes availability endpoint",done:true},{id:"c5",text:"Bridge polls every 30s, no memory leaks",done:true},{id:"c6",text:"Button hides when 0 agents online",done:false},{id:"c7",text:"Test coverage ≥ 85%",done:false}],
    comments:[{id:"cm2",user:"u2",text:"DOM observer pattern looks clean. Verify disconnectedCallback cleanup.",ts:"2026-03-03T14:22:00Z"},{id:"cm3",user:"u1",text:"Cleanup added and pushed. Should be solid now.",ts:"2026-03-03T14:45:00Z"}],
    approvers:[{id:"a2",user:"u2",status:"approved"},{id:"a3",user:"u3",status:"pending"}], blockers:[]
  },
  {
    id:"i3", type:"bug", title:"Omni-Channel routing drops Tier 2", status:"todo", priority:"critical", points:3,
    assignee:"u2", labels:["l4","l5"], startDate:"2026-03-03", endDate:"2026-03-06",
    description:"Routing flow silently drops Tier 2 support cases to wrong queue. SMTP routing keywords from obsolete flow never migrated to active flow.",
    criteria:[{id:"c8",text:"Reproduced consistently in sandbox",done:true},{id:"c9",text:"Root cause documented",done:false},{id:"c10",text:"Fix verified in UAT",done:false}],
    comments:[], approvers:[], blockers:["i2"]
  },
  {
    id:"i4", type:"task", title:"Provision PostgreSQL cluster on DO", status:"todo", priority:"medium", points:2,
    assignee:"u3", labels:[], startDate:"2026-03-04", endDate:"2026-03-05",
    description:"Provision Managed PostgreSQL 15 on DigitalOcean nyc3. Run all schema migrations and verify connectivity from app layer.",
    criteria:[], comments:[], approvers:[], blockers:[]
  },
  {
    id:"i5", type:"story", title:"Custom pre-chat LWC form", status:"in_review", priority:"medium", points:5,
    assignee:"u1", labels:["l1","l2"], startDate:"2026-03-01", endDate:"2026-03-08",
    description:"Branded pre-chat form: Name, Email, Subject, Account Type. Auto-populates authenticated user fields. Mobile-first.",
    criteria:[{id:"c11",text:"Fields saved to MessagingSession object",done:true},{id:"c12",text:"Auth user fields auto-populated",done:true},{id:"c13",text:"Responsive across breakpoints",done:true}],
    comments:[{id:"cm4",user:"u4",text:"Passes QA on Chrome/Safari/mobile. Firefox has a minor CSS offset — filing follow-up.",ts:"2026-03-02T09:10:00Z"}],
    approvers:[{id:"a4",user:"u2",status:"approved"}], blockers:[]
  },
  {
    id:"i6", type:"story", title:"SNS topic migration to QA account", status:"done", priority:"low", points:3,
    assignee:"u2", labels:[], startDate:"2026-03-01", endDate:"2026-03-03",
    description:"Migrate auto-panda SNS topics from prod to QA account. Update bogiefile configs with new account IDs and proxy settings via Avenue CLI.",
    criteria:[{id:"c14",text:"Topics migrated",done:true},{id:"c15",text:"IAM policies updated",done:true},{id:"c16",text:"Smoke tests passed",done:true}],
    comments:[], approvers:[], blockers:[]
  },
  {
    id:"i7", type:"story", title:"RevOps opportunity rollup system", status:"done", priority:"medium", points:8,
    assignee:"u4", labels:["l1","l3"], startDate:"2026-03-01", endDate:"2026-03-05",
    description:"Batch Apex architecture for multi-level opportunity hierarchy rollup. Needs_Count_Recalc__c flag drives traversal up to 5 levels deep.",
    criteria:[{id:"c17",text:"5-level hierarchy traversal correct",done:true},{id:"c18",text:"Batch job scheduled and monitored",done:true}],
    comments:[], approvers:[], blockers:[]
  },
];
