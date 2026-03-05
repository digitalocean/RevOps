import { useState, useRef, useCallback, useEffect } from "react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  surface:  "bg-[#111318]",
  raised:   "bg-[#16181f]",
  overlay:  "bg-[#1a1d27]",
  border:   "border-[rgba(255,255,255,0.07)]",
  borderSt: "border-[rgba(255,255,255,0.12)]",
  text:     "text-[#f3f4f6]",
  muted:    "text-[#9ca3af]",
  dim:      "text-[#6b7280]",
};

// ─── DATA ─────────────────────────────────────────────────────────────────────
const USERS = [
  { id:"u1", name:"Raj K.",   initials:"RK", bg:"bg-indigo-500",   hex:"#6366f1" },
  { id:"u2", name:"Sara K.",  initials:"SK", bg:"bg-violet-500",   hex:"#8b5cf6" },
  { id:"u3", name:"Aman M.",  initials:"AM", bg:"bg-emerald-600",  hex:"#059669" },
  { id:"u4", name:"Priya P.", initials:"PP", bg:"bg-amber-500",    hex:"#f59e0b" },
];

const LABELS = [
  { id:"l1", name:"Salesforce",   style:"bg-sky-500/10 text-sky-400 border-sky-500/20"      },
  { id:"l2", name:"LWC",          style:"bg-violet-500/10 text-violet-400 border-violet-500/20" },
  { id:"l3", name:"Apex",         style:"bg-jade-DEFAULT/10 text-[#2dd4a0] border-[#2dd4a0]/20" },
  { id:"l4", name:"P0 Bug",       style:"bg-rose-500/10 text-rose-400 border-rose-500/20"   },
  { id:"l5", name:"Omni-Channel", style:"bg-amber-500/10 text-amber-400 border-amber-500/20"},
];

const COLS = [
  { id:"backlog",     label:"Backlog",     color:"#6b7280", glow:"",             dot:"bg-[#6b7280]",   badge:"text-[#9ca3af]"            },
  { id:"todo",        label:"To Do",       color:"#9ca3af", glow:"",             dot:"bg-[#7a7e99]",   badge:"text-[#d1d5db]"            },
  { id:"in_progress", label:"In Progress", color:"#7c6af7", glow:"rgba(124,106,247,0.2)", dot:"bg-[#7c6af7]", badge:"text-[#7c6af7]" },
  { id:"in_review",   label:"In Review",   color:"#f5a623", glow:"rgba(245,166,35,0.2)",  dot:"bg-[#f5a623]", badge:"text-[#f5a623]" },
  { id:"done",        label:"Done",        color:"#2dd4a0", glow:"rgba(45,212,160,0.2)",  dot:"bg-[#2dd4a0]", badge:"text-[#2dd4a0]" },
];

const TYPE = {
  epic:  { icon:"⚡", label:"EPIC",  color:"#c084fc", bg:"bg-violet-500/10 text-violet-400", border:"border-l-violet-500/60"  },
  story: { icon:"◆",  label:"STORY", color:"#7c6af7", bg:"bg-[#7c6af7]/10 text-[#a89cf7]",  border:"border-l-[#7c6af7]/60"   },
  bug:   { icon:"●",  label:"BUG",   color:"#f25f5c", bg:"bg-rose-500/10 text-rose-400",     border:"border-l-rose-500/60"    },
  task:  { icon:"✓",  label:"TASK",  color:"#2dd4a0", bg:"bg-[#2dd4a0]/10 text-[#2dd4a0]",  border:"border-l-[#2dd4a0]/60"   },
};

const PRIO = {
  critical:{ color:"#f25f5c", bg:"bg-rose-500/10 text-rose-400",     label:"Critical", dot:"bg-rose-500"    },
  high:    { color:"#f5a623", bg:"bg-amber-500/10 text-amber-400",    label:"High",     dot:"bg-amber-500"   },
  medium:  { color:"#7c6af7", bg:"bg-[#7c6af7]/10 text-[#a89cf7]",   label:"Medium",   dot:"bg-[#7c6af7]"   },
  low:     { color:"#2dd4a0", bg:"bg-[#2dd4a0]/10 text-[#2dd4a0]",   label:"Low",      dot:"bg-[#2dd4a0]"   },
};

const SPRINT_START = new Date("2026-03-01");
const mkId = () => Math.random().toString(36).slice(2,9);
const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:4000";
const daysApart = (a,b) => Math.round((new Date(b)-new Date(a))/86400000);
const fmtTs = iso => iso ? new Date(iso).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "";
const byId = (arr,id) => arr.find(x=>x.id===id);
const colById  = id => byId(COLS,id);
const userById = id => byId(USERS,id);
const labelById= id => byId(LABELS,id);

const SEED = [
  { id:"i1", type:"epic",  title:"Messaging for Web v2",             status:"in_progress", priority:"high",     points:13, assignee:"u1", labels:["l1"],      startDate:"2026-03-01", endDate:"2026-03-12", description:"Full migration from legacy Embedded Service Chat to Messaging for Web — agent detection, pre-chat LWC forms, Omni-Channel routing, and branded launcher.", criteria:[{id:"c1",text:"Pre-chat LWC captures all required fields",done:true},{id:"c2",text:"Omni-Channel routing configured for all queues",done:true},{id:"c3",text:"Agent availability detection < 30s latency",done:false}], comments:[{id:"cm1",user:"u2",text:"The routing setup looks solid. Tested with Tier 2 agents yet?",ts:"2026-03-02T10:00:00Z"}], approvers:[{id:"a1",user:"u2",status:"approved"}], blockers:[] },
  { id:"i2", type:"story", title:"Agent availability detection LWC",  status:"in_progress", priority:"high",     points:8,  assignee:"u1", labels:["l1","l2"], startDate:"2026-03-01", endDate:"2026-03-07", description:"LWC bridge component polling Apex every 30s to detect online agents. DOM observer hides/shows the chat launcher with zero layout shift.", criteria:[{id:"c4",text:"Apex endpoint exposes agent availability",done:true},{id:"c5",text:"30s polling with proper cleanup on disconnect",done:true},{id:"c6",text:"Button hidden when 0 agents online",done:false},{id:"c7",text:"Unit test coverage ≥ 85%",done:false}], comments:[{id:"cm2",user:"u2",text:"DOM observer looks great! What about disconnectedCallback cleanup?",ts:"2026-03-03T14:22:00Z"},{id:"cm3",user:"u1",text:"Cleanup added. Pushed to feature/agent-avail branch.",ts:"2026-03-03T14:45:00Z"}], approvers:[{id:"a2",user:"u2",status:"approved"},{id:"a3",user:"u3",status:"pending"}], blockers:[] },
  { id:"i3", type:"bug",   title:"Omni-Channel routing fails Tier 2", status:"todo",        priority:"critical", points:3,  assignee:"u2", labels:["l4","l5"], startDate:"2026-03-03", endDate:"2026-03-06", description:"Cases from Tier 2 accounts route to the wrong queue. Root cause: SMTP keywords from deprecated flow never ported to active flow.", criteria:[{id:"c8",text:"Reproduced consistently in sandbox",done:true},{id:"c9",text:"Root cause documented",done:false},{id:"c10",text:"Fix verified in UAT",done:false}], comments:[], approvers:[], blockers:["i2"] },
  { id:"i4", type:"task",  title:"PostgreSQL cluster setup on DO",    status:"todo",        priority:"medium",   points:2,  assignee:"u3", labels:[],           startDate:"2026-03-04", endDate:"2026-03-05", description:"Provision Managed PostgreSQL 15 on DigitalOcean nyc3. Run schema migrations and verify connectivity from app layer.", criteria:[], comments:[], approvers:[], blockers:[] },
  { id:"i5", type:"story", title:"Custom pre-chat LWC form",          status:"in_review",   priority:"medium",   points:5,  assignee:"u1", labels:["l1","l2"], startDate:"2026-03-01", endDate:"2026-03-08", description:"Branded pre-chat form capturing Name, Email, Subject and Account Type. Authenticated users have fields auto-populated.", criteria:[{id:"c11",text:"Fields saved to MessagingSession record",done:true},{id:"c12",text:"Auth user fields auto-populated",done:true},{id:"c13",text:"Responsive across mobile breakpoints",done:true}], comments:[{id:"cm4",user:"u4",text:"Looks great on mobile. Minor CSS issue on Firefox — filing a follow-up.",ts:"2026-03-02T09:10:00Z"}], approvers:[{id:"a4",user:"u2",status:"approved"}], blockers:[] },
  { id:"i6", type:"story", title:"SNS topic migration to QA",         status:"done",        priority:"low",      points:3,  assignee:"u2", labels:[],           startDate:"2026-03-01", endDate:"2026-03-03", description:"Migrate auto-panda SNS topics from prod to QA account. Update bogiefile configs with new account IDs and proxy settings.", criteria:[{id:"c14",text:"All topics migrated",done:true},{id:"c15",text:"IAM policies updated via Avenue CLI",done:true},{id:"c16",text:"Smoke tests passed in QA",done:true}], comments:[], approvers:[], blockers:[] },
  { id:"i7", type:"story", title:"RevOps opportunity rollup system",  status:"done",        priority:"medium",   points:8,  assignee:"u4", labels:["l1","l3"], startDate:"2026-03-01", endDate:"2026-03-05", description:"Batch Apex architecture for opportunity hierarchy rollup with Needs_Count_Recalc__c flagging. Supports up to 5-level traversal.", criteria:[{id:"c17",text:"5-level hierarchy traversal working",done:true},{id:"c18",text:"Batch scheduled and monitored",done:true}], comments:[], approvers:[], blockers:[] },
];

// ─── ATOMS ────────────────────────────────────────────────────────────────────
function Avatar({ userId, size=6 }) {
  const u = userById(userId); if (!u) return null;
  const s = `w-${size} h-${size}`;
  return <div title={u.name} style={{width:size*4,height:size*4,background:u.hex,fontSize:size*1.5}} className="rounded-full flex items-center justify-center text-white font-semibold ring-[1.5px] ring-[rgba(255,255,255,0.1)] flex-shrink-0">{u.initials}</div>;
}

function Chip({ children, className="" }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wide border ${className}`}>{children}</span>;
}

function PillBtn({ children, onClick, color="accent", size="md", disabled=false, className="" }) {
  const colors = {
    accent:  "bg-[#7c6af7] hover:bg-[#6b5ce7] text-white border-[#7c6af7]/40",
    ghost:   "bg-transparent hover:bg-white/5 text-[#9ca3af] hover:text-[#f3f4f6] border-transparent",
    surface: "bg-[#16181f] hover:bg-[#1a1d27] text-[#d1d5db] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)]",
    jade:    "bg-[#2dd4a0]/10 hover:bg-[#2dd4a0]/20 text-[#2dd4a0] border-[#2dd4a0]/20",
    amber:   "bg-[#f5a623]/10 hover:bg-[#f5a623]/20 text-[#f5a623] border-[#f5a623]/20",
    rose:    "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20",
    danger:  "bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border-rose-500/20",
  };
  const sizes = { sm:"px-2.5 py-1 text-xs", md:"px-3.5 py-1.5 text-sm", lg:"px-4 py-2 text-sm" };
  return (
    <button onClick={onClick} disabled={disabled} className={`${colors[color]} ${sizes[size]} rounded-lg font-medium border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}>{children}</button>
  );
}

function Toast({ t }) {
  if (!t) return null;
  const isErr = t.type === "error";
  return (
    <div style={{animation:"toast-in 0.3s cubic-bezier(0.16,1,0.3,1)"}} className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-modal text-sm font-medium ${isErr ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : "bg-[#1a1d27] border-[rgba(255,255,255,0.1)] text-[#f3f4f6]"}`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${isErr ? "bg-rose-500/20 text-rose-400" : "bg-[#2dd4a0]/20 text-[#2dd4a0]"}`}>{isErr ? "!" : "✓"}</span>
      {t.msg}
    </div>
  );
}

function Input({ value, onChange, placeholder, className="", onKeyDown, autoFocus=false, type="text" }) {
  return <input type={type} value={value} onChange={onChange} onKeyDown={onKeyDown} autoFocus={autoFocus} placeholder={placeholder} className={`bg-[#111318] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f3f4f6] placeholder-[#6b7280] focus:border-[#7c6af7] focus:ring-1 focus:ring-[#7c6af7]/30 transition-all outline-none ${className}`}/>;
}

function Select({ value, onChange, children, className="" }) {
  return <select value={value} onChange={onChange} className={`bg-[#111318] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f3f4f6] focus:border-[#7c6af7] outline-none ${className}`}>{children}</select>;
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [items, setItems] = useState(SEED);
  const [view, setView] = useState("board");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [teamMembers, setTeamMembers] = useState([
    { id:"u1", name:"Raj K.",   role:"Lead Developer",  email:"raj@company.com",   avatar:"RK", color:"#6366f1", active:true },
    { id:"u2", name:"Sara K.",  role:"Product Manager", email:"sara@company.com",  avatar:"SK", color:"#8b5cf6", active:true },
    { id:"u3", name:"Aman M.",  role:"DevOps Engineer", email:"aman@company.com",  avatar:"AM", color:"#059669", active:true },
    { id:"u4", name:"Priya P.", role:"Data Analyst",    email:"priya@company.com", avatar:"PP", color:"#f59e0b", active:true },
  ]);
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [showCreateSprintModal, setShowCreateSprintModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [projRes, sprintRes] = await Promise.all([
          fetch(`${API_BASE}/api/projects`),
          fetch(`${API_BASE}/api/sprints`),
        ]);
        if (projRes.ok) setProjects(await projRes.json());
        if (sprintRes.ok) setSprints(await sprintRes.json());
      } catch (_) { /* backend not running or CORS — keep empty */ }
    };
    load();
  }, []);

  const refreshSprints = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sprints`);
      if (res.ok) setSprints(await res.json());
    } catch (_) {}
  }, []);

  const notify = useCallback((msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),2500); }, []);
  const updateItem = useCallback((id,patch) => setItems(p=>p.map(i=>i.id===id?{...i,...patch}:i)), []);
  const deleteItem = useCallback((id) => { setItems(p=>p.filter(i=>i.id!==id)); setModal(null); notify("Item deleted"); }, [notify]);
  const addItem = useCallback((item) => { setItems(p=>[...p,item]); notify("Item created"); }, [notify]);

  const filtered = items.filter(i=>(filterType==="all"||i.type===filterType)&&(!search||i.title.toLowerCase().includes(search.toLowerCase())));
  const activeItem = modal ? items.find(i=>i.id===modal) : null;

  const doneCt = items.filter(i=>i.status==="done").length;
  const totalPts = items.reduce((s,i)=>s+i.points,0);
  const donePts = items.filter(i=>i.status==="done").reduce((s,i)=>s+i.points,0);

  return (
    <div className="flex h-screen bg-[#0d0e14] overflow-hidden text-[#f3f4f6]">
      <Toast t={toast}/>

      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-[rgba(255,255,255,0.06)] bg-[#0d0e14]">
        <div className="px-4 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7c6af7] to-[#9f7aea] flex items-center justify-center shadow-glow-sm">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="text-sm font-semibold text-[#f3f4f6]">AgileOps</span>
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2dd4a0] animate-pulse"/>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#111318] border border-[rgba(255,255,255,0.06)]">
            <div className="w-4 h-4 rounded bg-[#7c6af7]/20 flex items-center justify-center">
              <span className="text-[#7c6af7] text-[9px] font-bold">D</span>
            </div>
            <span className="text-[#9ca3af] text-xs font-medium">DigitalOcean</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <p className="text-[9px] font-semibold text-[#6b7280] px-2 py-1.5 tracking-[0.1em] uppercase">Workspace</p>
          {[["board","⊞","Board"],["list","≡","List"],["gantt","▤","Gantt"],["metrics","◈","Metrics"],["team","◉","Team"]].map(([v,ic,lb])=>(
            <button key={v} onClick={()=>setView(v)} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group ${view===v ? "bg-[#7c6af7]/12 text-[#a89cf7]" : "text-[#6b7280] hover:text-[#d1d5db] hover:bg-white/[0.03]"}`}>
              <span className={`text-sm transition-colors ${view===v ? "text-[#7c6af7]" : "text-[#6b7280] group-hover:text-[#9ca3af]"}`}>{ic}</span>
              {lb}
              {view===v && <span className="ml-auto w-1 h-4 rounded-full bg-[#7c6af7]"/>}
            </button>
          ))}

          <p className="text-[9px] font-semibold text-[#6b7280] px-2 py-1.5 mt-3 tracking-[0.1em] uppercase">Projects</p>
          {[["RevOps Initiative","#7c6af7","active"],["Experience Cloud","#8b5cf6","idle"],["Infrastructure","#059669","idle"]].map(([name,hex,st])=>(
            <div key={name} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] cursor-pointer transition-all ${st==="active"?"text-[#d1d5db] bg-white/[0.02]":"text-[#6b7280] hover:text-[#9ca3af]"}`}>
              <div style={{background:hex}} className="w-2 h-2 rounded-sm flex-shrink-0 opacity-80"/>
              <span className="truncate">{name}</span>
              {st==="active"&&<span className="ml-auto text-[#2dd4a0] text-[9px] font-semibold">●</span>}
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar userId="u1" size={7}/>
            <div><p className="text-[12px] font-semibold text-[#f3f4f6]">Raj K.</p><p className="text-[10px] text-[#6b7280]">Admin</p></div>
            <button className="ml-auto text-[#6b7280] hover:text-[#9ca3af] text-sm transition-colors">⚙</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[#0d0e14] flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
            <span>DigitalOcean</span><span className="opacity-30">/</span>
            <span className="text-[#9ca3af]">RevOps</span><span className="opacity-30">/</span>
            <span className="text-[#a89cf7] font-semibold">Sprint 14</span>
          </div>
          <div className="flex-1"/>
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="pl-8 pr-3 py-1.5 text-[12px] bg-[#111318] border border-[rgba(255,255,255,0.07)] rounded-lg outline-none focus:border-[#7c6af7]/50 text-[#f3f4f6] placeholder-[#6b7280] w-44 transition-all"/>
          </div>
          <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="bg-[#111318] border border-[rgba(255,255,255,0.07)] rounded-lg px-2.5 py-1.5 text-[12px] text-[#9ca3af] outline-none focus:border-[#7c6af7]/50">
            <option value="all">All types</option>
            <option value="epic">⚡ Epic</option><option value="story">◆ Story</option>
            <option value="bug">● Bug</option><option value="task">✓ Task</option>
          </select>
          {/* View switcher */}
          <div className="flex items-center bg-[#111318] border border-[rgba(255,255,255,0.07)] rounded-lg p-1 gap-0.5">
            {[["board","⊞"],["list","≡"],["gantt","▤"],["metrics","◈"],["team","◉"]].map(([v,ic])=>(
              <button key={v} onClick={()=>setView(v)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${view===v?"bg-[#7c6af7] text-white shadow-glow-sm":"text-[#6b7280] hover:text-[#9ca3af]"}`}>{ic} {v.charAt(0).toUpperCase()+v.slice(1)}</button>
            ))}
          </div>
        </div>

        {/* Sprint header */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[#111318]/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#7c6af7] animate-pulse"/>
            <span className="text-sm font-semibold text-[#f3f4f6]">Sprint 14</span>
            <span className="text-[11px] text-[#6b7280] font-medium">Q1 2026 · Mar 1–14</span>
          </div>
          <span className="text-[#374151] text-sm">|</span>
          <span className="text-[12px] text-[#6b7280]">Ship Messaging for Web v2 + fix P0 routing bug</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={()=>setShowCreateSprintModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#7c6af7]/40 bg-[#7c6af7]/10 text-[#a89cf7] text-[12px] font-medium hover:bg-[#7c6af7]/20 transition-colors">
              + New sprint
            </button>
            {[
              [`${doneCt}/${items.length}`,"items", "#7c6af7"],
              [`${donePts}/${totalPts}`,"pts", "#2dd4a0"],
              [`${items.length ? Math.round(doneCt/items.length*100) : 0}%`,"velocity", "#f5a623"],
            ].map(([val,lbl,col])=>(
              <div key={lbl} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#16181f] border border-[rgba(255,255,255,0.06)]">
                <span style={{color:col}} className="text-xs font-bold tabular-nums">{val}</span>
                <span className="text-[10px] text-[#6b7280]">{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {view==="board"   && <BoardView   filtered={filtered} items={items} updateItem={updateItem} addItem={addItem} setModal={setModal} dragId={dragId} dragOver={dragOver} onDragStart={setDragId} onDragOver={setDragOver} onDrop={colId=>{if(dragId){updateItem(dragId,{status:colId});notify(`→ ${colById(colId)?.label}`);}setDragId(null);setDragOver(null);}} notify={notify}/>}
          {view==="list"    && <ListView    filtered={filtered} items={items} updateItem={updateItem} addItem={addItem} setModal={setModal} notify={notify} deleteItem={deleteItem}/>}
          {view==="gantt"   && <GanttView   filtered={filtered} setModal={setModal}/>}
          {view==="metrics" && <MetricsView items={items}/>}
          {view==="team"    && <TeamView    teamMembers={teamMembers} setTeamMembers={setTeamMembers} notify={notify}/>}
        </div>
      </div>

      {activeItem && <ItemModal item={activeItem} items={items} onClose={()=>setModal(null)} onUpdate={p=>updateItem(activeItem.id,p)} onDelete={()=>deleteItem(activeItem.id)} notify={notify}/>}
      {showCreateSprintModal && <CreateSprintModal projects={projects} onClose={()=>setShowCreateSprintModal(false)} onCreated={()=>{ refreshSprints(); setShowCreateSprintModal(false); notify("Sprint created"); }} notify={notify}/>}
    </div>
  );
}

// ─── BOARD ────────────────────────────────────────────────────────────────────
function BoardView({filtered,items,updateItem,addItem,setModal,dragId,dragOver,onDragStart,onDragOver,onDrop,notify}) {
  return (
    <div className="flex gap-3 p-5 min-w-max items-start min-h-full">
      {COLS.map(col=>(
        <Column key={col.id} col={col} items={filtered.filter(i=>i.status===col.id)} dragId={dragId} dragOver={dragOver} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onCardClick={setModal} addItem={addItem}/>
      ))}
    </div>
  );
}

function Column({col,items,dragId,dragOver,onDragStart,onDragOver,onDrop,onCardClick,addItem}) {
  const [adding,setAdding]=useState(false);
  const [title,setTitle]=useState("");
  const ref=useRef();
  const isOver=dragOver===col.id;
  const confirm=()=>{
    if(!title.trim()){setAdding(false);return;}
    addItem({id:"i"+mkId(),type:"task",title:title.trim(),status:col.id,priority:"medium",points:1,assignee:"u1",labels:[],startDate:"2026-03-04",endDate:"2026-03-10",description:"",criteria:[],comments:[],approvers:[],blockers:[]});
    setTitle("");setAdding(false);
  };
  return (
    <div className={`w-[272px] flex-shrink-0 flex flex-col rounded-xl transition-all duration-200 ${isOver?"ring-1 ring-[#7c6af7]/50 bg-[#7c6af7]/[0.03]":""}`}
      onDragOver={e=>{e.preventDefault();onDragOver(col.id);}} onDrop={e=>{e.preventDefault();onDrop(col.id);}}>
      <div className="flex items-center gap-2 px-1 pb-3">
        <div style={{background:col.color}} className="w-2 h-2 rounded-full"/>
        <span className="text-[12px] font-semibold text-[#9ca3af]">{col.label}</span>
        <span style={{color:col.color}} className="ml-auto text-[11px] font-bold tabular-nums opacity-70">{items.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map(item=><Card key={item.id} item={item} isDragging={dragId===item.id} onDragStart={()=>onDragStart(item.id)} onClick={()=>onCardClick(item.id)}/>)}
        {adding ? (
          <div className="bg-[#16181f] rounded-xl border border-[rgba(255,255,255,0.1)] p-3">
            <input ref={ref} value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")confirm();if(e.key==="Escape"){setAdding(false);setTitle("");}}} autoFocus placeholder="Item title… Enter to save" className="w-full bg-transparent text-sm text-[#f3f4f6] placeholder-[#6b7280] outline-none"/>
            <div className="flex gap-2 mt-2.5">
              <PillBtn size="sm" onClick={confirm}>Save</PillBtn>
              <PillBtn size="sm" color="ghost" onClick={()=>{setAdding(false);setTitle("");}}>Cancel</PillBtn>
            </div>
          </div>
        ) : (
          <button onClick={()=>{setAdding(true);setTimeout(()=>ref.current?.focus(),40);}} className="w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-[rgba(255,255,255,0.06)] text-[12px] text-[#6b7280] hover:text-[#7c6af7] hover:border-[#7c6af7]/30 hover:bg-[#7c6af7]/[0.04] transition-all duration-150">
            + Add item
          </button>
        )}
      </div>
    </div>
  );
}

function Card({item,isDragging,onDragStart,onClick}) {
  const tc=TYPE[item.type]||TYPE.task, pc=PRIO[item.priority]||PRIO.medium;
  const doneCrit=item.criteria.filter(c=>c.done).length, totCrit=item.criteria.length;
  const isBlocked=item.blockers?.length>0;
  const pct=totCrit>0?doneCrit/totCrit*100:0;
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className={`card-item group cursor-pointer bg-[#111318] rounded-xl border border-l-2 ${tc.border} border-y-[rgba(255,255,255,0.07)] border-r-[rgba(255,255,255,0.07)] p-3.5 shadow-card select-none ${isDragging?"opacity-30 scale-95":""} ${isBlocked?"border-l-rose-500/60":""}`}>
      {isBlocked && <div className="flex items-center gap-1.5 mb-2.5 text-[10px] font-semibold text-rose-400"><span>◉</span>BLOCKED</div>}
      <div className="flex items-center gap-2 mb-2.5">
        <Chip className={tc.bg}>{tc.icon} {tc.label}</Chip>
        <div className="ml-auto flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${pc.dot}`}/><span className={`text-[10px] font-medium ${pc.bg.split(' ').find(c=>c.startsWith('text-'))}`}>{pc.label}</span></div>
      </div>
      <p className={`text-[13px] font-medium leading-snug mb-3 text-[#f3f4f6] group-hover:text-white transition-colors ${item.status==="done"?"line-through opacity-40":""}`}>{item.title}</p>
      {item.labels?.length>0 && (
        <div className="flex gap-1 flex-wrap mb-2.5">
          {item.labels.slice(0,3).map(lid=>{const l=labelById(lid);return l?<Chip key={lid} className={l.style}>{l.name}</Chip>:null;})}
        </div>
      )}
      {totCrit>0 && (
        <div className="mb-2.5">
          <div className="h-[3px] bg-[#16181f] rounded-full overflow-hidden">
            <div style={{width:`${pct}%`,background:tc.color}} className="h-full rounded-full transition-all duration-500"/>
          </div>
          <p className="text-[10px] text-[#6b7280] mt-1 tabular-nums">{doneCrit}/{totCrit} criteria</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#6b7280] font-medium tabular-nums">{item.points}pt</span>
        {item.comments?.length>0 && <span className="text-[11px] text-[#6b7280]">💬 {item.comments.length}</span>}
        {item.approvers?.length>0 && <span className={`text-[11px] font-medium ${item.approvers.every(a=>a.status==="approved")?"text-[#2dd4a0]":"text-[#f5a623]"}`}>✓ {item.approvers.filter(a=>a.status==="approved").length}/{item.approvers.length}</span>}
        <div className="ml-auto">{item.assignee && <Avatar userId={item.assignee} size={5}/>}</div>
      </div>
    </div>
  );
}

// ─── LIST ─────────────────────────────────────────────────────────────────────
function ListView({filtered,items,updateItem,addItem,setModal,notify,deleteItem}) {
  const [editId,setEditId]=useState(null);
  const [buf,setBuf]=useState({});
  const [addingRow,setAddingRow]=useState(false);
  const [nr,setNr]=useState({type:"task",title:"",status:"backlog",priority:"medium",points:1,assignee:"u1"});
  const addRef=useRef();
  const startEdit=item=>{setEditId(item.id);setBuf({title:item.title,status:item.status,priority:item.priority,points:item.points,assignee:item.assignee||"",type:item.type});};
  const saveEdit=id=>{updateItem(id,buf);setEditId(null);notify("Saved");};
  const confirmNew=()=>{if(!nr.title.trim()){setAddingRow(false);return;}addItem({id:"i"+mkId(),...nr,labels:[],description:"",criteria:[],comments:[],approvers:[],blockers:[],startDate:"2026-03-04",endDate:"2026-03-10"});setNr({type:"task",title:"",status:"backlog",priority:"medium",points:1,assignee:"u1"});setAddingRow(false);};
  const th="px-4 py-2.5 text-left text-[10px] font-semibold text-[#9ca3af] tracking-[0.08em] uppercase bg-[#111318] border-b border-[rgba(255,255,255,0.06)]";
  const td="px-4 py-3 text-[13px] align-middle border-b border-[rgba(255,255,255,0.04)]";
  const InlineSel=({val,onChange,opts})=><Select value={val} onChange={e=>onChange(e.target.value)} className="text-xs py-1 px-2 w-full">{opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select>;
  return (
    <div className="p-5">
      <div className="bg-[#111318] rounded-xl border border-[rgba(255,255,255,0.07)] overflow-hidden shadow-card">
        <table className="w-full border-collapse">
          <thead><tr>{["Type","Title","Status","Priority","Pts","Assignee",""].map(h=><th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((item,idx)=>{
              const isEdit=editId===item.id, tc=TYPE[item.type]||TYPE.task, pc=PRIO[item.priority]||PRIO.medium, col=colById(item.status);
              return (
                <tr key={item.id} className={`group transition-colors ${isEdit?"bg-[#7c6af7]/[0.05]":idx%2===0?"bg-transparent":"bg-white/[0.01]"} hover:bg-white/[0.02]`}>
                  <td className={td}>{isEdit?<InlineSel val={buf.type} onChange={v=>setBuf(b=>({...b,type:v}))} opts={[["epic","⚡ Epic"],["story","◆ Story"],["bug","● Bug"],["task","✓ Task"]]}/>:<Chip className={tc.bg}>{tc.icon} {tc.label}</Chip>}</td>
                  <td className={`${td} max-w-[240px]`}>{isEdit?<Input value={buf.title} onChange={e=>setBuf(b=>({...b,title:e.target.value}))} className="w-full text-xs py-1"/>:<button onClick={()=>setModal(item.id)} className={`text-left font-medium hover:text-[#a89cf7] transition-colors text-[13px] ${item.status==="done"?"line-through opacity-40":"text-[#f3f4f6]"}`}>{item.title}</button>}</td>
                  <td className={td}>{isEdit?<InlineSel val={buf.status} onChange={v=>setBuf(b=>({...b,status:v}))} opts={COLS.map(c=>[c.id,c.label])}/>:col&&<span style={{color:col.color}} className="text-[11px] font-semibold">{col.label}</span>}</td>
                  <td className={td}>{isEdit?<InlineSel val={buf.priority} onChange={v=>setBuf(b=>({...b,priority:v}))} opts={Object.entries(PRIO).map(([k,v])=>[k,v.label])}/>:<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${pc.dot}`}/><span className={`text-[11px] font-medium ${pc.bg.split(' ').find(c=>c.startsWith('text-'))}`}>{pc.label}</span></div>}</td>
                  <td className={`${td} text-center tabular-nums`}>{isEdit?<Input type="number" value={buf.points} onChange={e=>setBuf(b=>({...b,points:+e.target.value}))} className="w-14 text-center text-xs py-1"/>:<span className="text-[#9ca3af] font-medium">{item.points}</span>}</td>
                  <td className={td}>{isEdit?<InlineSel val={buf.assignee} onChange={v=>setBuf(b=>({...b,assignee:v}))} opts={[["","—"],...USERS.map(u=>[u.id,u.name])]}/>:item.assignee?<Avatar userId={item.assignee} size={6}/>:<span className="text-[#6b7280]">—</span>}</td>
                  <td className={`${td} w-24`}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isEdit?(<><PillBtn size="sm" color="jade" onClick={()=>saveEdit(item.id)}>Save</PillBtn><PillBtn size="sm" color="ghost" onClick={()=>setEditId(null)}>✕</PillBtn></>):(
                        <><button onClick={()=>startEdit(item)} className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#a89cf7] hover:bg-[#7c6af7]/10 transition-all" title="Edit">✏</button><button onClick={()=>setModal(item.id)} className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#52b8f5] hover:bg-[#52b8f5]/10 transition-all" title="Details">⊙</button><button onClick={()=>{if(window.confirm("Delete?"))deleteItem(item.id);}} className="p-1.5 rounded-lg text-[#6b7280] hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Delete">✕</button></>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {addingRow&&(
              <tr className="bg-[#7c6af7]/[0.06] border-t border-[#7c6af7]/20">
                <td className={td}><InlineSel val={nr.type} onChange={v=>setNr(r=>({...r,type:v}))} opts={[["epic","⚡ Epic"],["story","◆ Story"],["bug","● Bug"],["task","✓ Task"]]}/></td>
                <td className={td}><Input ref={addRef} value={nr.title} onChange={e=>setNr(r=>({...r,title:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")confirmNew();if(e.key==="Escape")setAddingRow(false);}} autoFocus placeholder="Item title…" className="w-full text-xs py-1"/></td>
                <td className={td}><InlineSel val={nr.status} onChange={v=>setNr(r=>({...r,status:v}))} opts={COLS.map(c=>[c.id,c.label])}/></td>
                <td className={td}><InlineSel val={nr.priority} onChange={v=>setNr(r=>({...r,priority:v}))} opts={Object.entries(PRIO).map(([k,v])=>[k,v.label])}/></td>
                <td className={td}><Input type="number" value={nr.points} onChange={e=>setNr(r=>({...r,points:+e.target.value}))} className="w-14 text-center text-xs py-1"/></td>
                <td className={td}><InlineSel val={nr.assignee} onChange={v=>setNr(r=>({...r,assignee:v}))} opts={[["","—"],...USERS.map(u=>[u.id,u.name])]}/></td>
                <td className={td}><div className="flex gap-1.5"><PillBtn size="sm" onClick={confirmNew}>Add</PillBtn><PillBtn size="sm" color="ghost" onClick={()=>setAddingRow(false)}>✕</PillBtn></div></td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-2.5">
          <button onClick={()=>{setAddingRow(true);setTimeout(()=>addRef.current?.focus(),50);}} className="flex items-center gap-2 text-[12px] text-[#6b7280] hover:text-[#7c6af7] px-2 py-1.5 rounded-lg hover:bg-[#7c6af7]/[0.06] transition-all">
            <span className="text-base font-light leading-none">+</span> Add a row
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── GANTT ────────────────────────────────────────────────────────────────────
function GanttView({filtered,setModal}) {
  const DAYS=14,DW=50,RH=44,LW=232;
  const days=Array.from({length:DAYS},(_,i)=>{const d=new Date(SPRINT_START);d.setDate(d.getDate()+i);return d;});
  const todayOff=daysApart(SPRINT_START,new Date("2026-03-04"));
  const toBar=item=>{const s=item.startDate?Math.max(0,daysApart(SPRINT_START,new Date(item.startDate))):0;const e=item.endDate?Math.min(DAYS,daysApart(SPRINT_START,new Date(item.endDate))+1):s+2;return{s:Math.max(0,s),w:Math.max(1,e-s)};};
  return (
    <div className="p-5">
      <div className="bg-[#111318] rounded-xl border border-[rgba(255,255,255,0.07)] overflow-hidden shadow-card">
        <div className="px-5 py-3.5 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-4">
          <span className="text-sm font-semibold text-[#f3f4f6]">Sprint Timeline</span>
          <span className="text-[11px] text-[#6b7280]">Mar 1–14, 2026</span>
          <div className="flex items-center gap-4 ml-auto">
            {COLS.filter(c=>c.id!=="backlog").map(c=>(
              <div key={c.id} className="flex items-center gap-1.5 text-[11px] text-[#6b7280]">
                <div style={{background:c.color}} className="w-2 h-2 rounded-sm opacity-80"/>{c.label}
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="flex" style={{minWidth:LW+DAYS*DW}}>
            {/* Labels */}
            <div style={{width:LW}} className="flex-shrink-0 border-r border-[rgba(255,255,255,0.06)]">
              <div style={{height:36}} className="flex items-center px-4 border-b border-[rgba(255,255,255,0.06)] bg-[#0d0e14]/50">
                <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-widest">Item</span>
              </div>
              {filtered.map(item=>{
                const tc=TYPE[item.type]||TYPE.task;
                return (
                  <div key={item.id} onClick={()=>setModal(item.id)} style={{height:RH}} className="flex items-center gap-2.5 px-4 border-b border-[rgba(255,255,255,0.04)] cursor-pointer hover:bg-white/[0.02] transition-colors group">
                    <Chip className={`${tc.bg} flex-shrink-0`}>{tc.icon}</Chip>
                    <span className="text-[12px] font-medium text-[#9ca3af] group-hover:text-[#f3f4f6] transition-colors truncate flex-1">{item.title}</span>
                    {item.assignee&&<Avatar userId={item.assignee} size={5}/>}
                  </div>
                );
              })}
            </div>
            {/* Timeline */}
            <div className="flex-1 relative overflow-hidden">
              {/* Day headers */}
              <div className="flex" style={{height:36}}>
                {days.map((d,i)=>(
                  <div key={i} style={{width:DW}} className={`flex-shrink-0 flex items-center justify-center border-b border-r border-[rgba(255,255,255,0.04)] text-[10px] ${i===todayOff?"text-[#7c6af7] font-bold bg-[#7c6af7]/[0.08]":d.getDay()===0||d.getDay()===6?"text-[#4b5563]":"text-[#6b7280] font-medium"}`}>
                    {d.getDate()===1||i===0?d.toLocaleDateString("en-US",{month:"short",day:"numeric"}):d.getDate()}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {filtered.map((item,ri)=>{
                const {s,w}=toBar(item), col=colById(item.status)||COLS[0];
                const pct=item.criteria.length>0?item.criteria.filter(c=>c.done).length/item.criteria.length:0;
                const isBlocked=item.blockers?.length>0;
                return (
                  <div key={item.id} style={{height:RH}} className={`flex relative border-b border-[rgba(255,255,255,0.04)] ${ri%2===0?"bg-transparent":"bg-white/[0.01]"}`}>
                    {days.map((_,i)=><div key={i} style={{width:DW}} className={`flex-shrink-0 border-r border-[rgba(255,255,255,0.03)] h-full ${i===todayOff?"bg-[#7c6af7]/[0.04]":""}`}/>)}
                    <div onClick={()=>setModal(item.id)} style={{position:"absolute",left:s*DW+4,width:w*DW-8,top:10,height:24,background:isBlocked?"rgba(242,95,92,0.12)":col.glow||"rgba(124,106,247,0.1)",border:`1px solid ${isBlocked?"rgba(242,95,92,0.3)":col.color+"50"}`}} className="rounded-lg cursor-pointer overflow-hidden transition-all hover:scale-y-105 z-[1] group">
                      <div style={{width:`${pct*100}%`,background:isBlocked?"rgba(242,95,92,0.4)":col.color+"60"}} className="absolute inset-y-0 left-0 rounded-l-lg transition-all"/>
                      {w>=3&&<span style={{color:col.color}} className="relative px-2 text-[10px] font-semibold whitespace-nowrap block truncate leading-6 opacity-90">{item.title}</span>}
                    </div>
                  </div>
                );
              })}
              {/* Today line */}
              <div className="absolute top-9 bottom-0 z-20 pointer-events-none" style={{left:todayOff*DW+DW/2}}>
                <div className="w-px h-full" style={{background:"rgba(124,106,247,0.5)"}}/>
                <div className="absolute -top-px -left-5 bg-[#7c6af7] text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">TODAY</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── METRICS ─────────────────────────────────────────────────────────────────
function MetricsView({items}) {
  const total=items.length;
  const byStatus=COLS.map(c=>({...c,count:items.filter(i=>i.status===c.id).length,pts:items.filter(i=>i.status===c.id).reduce((s,i)=>s+i.points,0)}));
  const byUser=USERS.map(u=>({u,count:items.filter(i=>i.assignee===u.id).length,done:items.filter(i=>i.assignee===u.id&&i.status==="done").length,pts:items.filter(i=>i.assignee===u.id).reduce((s,i)=>s+i.points,0)}));
  const totalPts=items.reduce((s,i)=>s+i.points,0), donePts=items.filter(i=>i.status==="done").reduce((s,i)=>s+i.points,0), vel=totalPts?Math.round(donePts/totalPts*100):0;
  const byType=["epic","story","bug","task"].map(t=>({t,count:items.filter(i=>i.type===t).length}));
  const byPrio=Object.entries(PRIO).map(([p,cfg])=>({p,cfg,count:items.filter(i=>i.priority===p).length}));
  const burn=Array.from({length:14},(_,i)=>({d:i,ideal:Math.round(totalPts*(1-i/13)),actual:i<=3?Math.round(totalPts*(1-(i/13)*(vel/100))+(Math.random()-.5)*1.2):null}));
  const W=560,H=150,pl=36,pr=16,pt=8,pb=24;
  const xs=i=>pl+i*(W-pl-pr)/13, ys=v=>H-pb-(v/(totalPts||1))*(H-pt-pb);

  const KCard=({label,value,sub,col="#7c6af7"})=>(
    <div className="bg-[#111318] rounded-xl border border-[rgba(255,255,255,0.07)] p-5 shadow-card">
      <p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.08em] mb-2">{label}</p>
      <p style={{color:col}} className="text-3xl font-bold tabular-nums">{value}</p>
      {sub&&<p className="text-[11px] text-[#6b7280] mt-1.5">{sub}</p>}
    </div>
  );

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <KCard label="Total Items"  value={total}   sub={`${items.filter(i=>i.status==="in_progress").length} active`} col="#7c6af7"/>
        <KCard label="Completed"    value={items.filter(i=>i.status==="done").length} sub={`${vel}% velocity`} col="#2dd4a0"/>
        <KCard label="Story Points" value={`${donePts}/${totalPts}`} sub="done / total" col="#52b8f5"/>
        <KCard label="Blocked"      value={items.filter(i=>i.blockers?.length>0).length} sub="need attention" col="#f25f5c"/>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Burndown */}
        <div className="bg-[#111318] rounded-xl border border-[rgba(255,255,255,0.07)] p-5 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-semibold text-[#f3f4f6]">Sprint Burndown</span>
            <div className="flex gap-4 ml-auto text-[10px] text-[#6b7280]">
              <span className="flex items-center gap-1.5"><span style={{width:16,height:1,borderTop:"1.5px dashed #6b7280",display:"inline-block"}}/> Ideal</span>
              <span className="flex items-center gap-1.5"><span style={{width:16,height:2,background:"#7c6af7",display:"inline-block",borderRadius:2}}/> Actual</span>
            </div>
          </div>
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c6af7" stopOpacity=".2"/>
                <stop offset="100%" stopColor="#7c6af7" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {[0,25,50,75,100].map(p=>(
              <g key={p}>
                <line x1={pl} y1={ys(totalPts*p/100)} x2={W-pr} y2={ys(totalPts*p/100)} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                <text x={pl-4} y={ys(totalPts*p/100)+4} textAnchor="end" fontSize="9" fill="#6b7280">{Math.round(totalPts*(1-p/100))}</text>
              </g>
            ))}
            <polyline points={burn.map((d,i)=>`${xs(i)},${ys(d.ideal)}`).join(" ")} fill="none" stroke="#6b7280" strokeWidth="1" strokeDasharray="4,3"/>
            {burn.filter(d=>d.actual!=null).length>1&&(
              <polygon points={[...burn.filter(d=>d.actual!=null).map((d,i)=>`${xs(i)},${ys(d.actual)}`),`${xs(burn.filter(d=>d.actual!=null).length-1)},${H-pb}`,`${xs(0)},${H-pb}`].join(" ")} fill="url(#burnGrad)"/>
            )}
            <polyline points={burn.filter(d=>d.actual!=null).map((d,i)=>`${xs(i)},${ys(d.actual)}`).join(" ")} fill="none" stroke="#7c6af7" strokeWidth="2"/>
            {burn.filter(d=>d.actual!=null).map((d,i)=><circle key={i} cx={xs(i)} cy={ys(d.actual)} r="3" fill="#7c6af7" stroke="#111318" strokeWidth="1.5"/>)}
            {burn.filter((_,i)=>i%2===0).map((d,i)=><text key={i} x={xs(i*2)} y={H-6} textAnchor="middle" fontSize="8.5" fill="#6b7280">Mar {d.d+1}</text>)}
          </svg>
        </div>

        {/* Team workload */}
        <div className="bg-[#111318] rounded-xl border border-[rgba(255,255,255,0.07)] p-5 shadow-card">
          <p className="text-sm font-semibold text-[#f3f4f6] mb-4">Team Workload</p>
          <div className="space-y-4">
            {byUser.map(({u,count,done,pts})=>(
              <div key={u.id} className="flex items-center gap-3">
                <Avatar userId={u.id} size={7}/>
                <div className="flex-1">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] font-semibold text-[#d1d5db]">{u.name}</span>
                    <span className="text-[10px] text-[#6b7280] tabular-nums">{done}/{count} · {pts}pts</span>
                  </div>
                  <div className="h-1.5 bg-[#16181f] rounded-full overflow-hidden">
                    <div style={{width:`${count?done/count*100:0}%`,background:u.hex}} className="h-full rounded-full transition-all duration-700"/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status bars */}
        <div className="bg-[#111318] rounded-xl border border-[rgba(255,255,255,0.07)] p-5 shadow-card">
          <p className="text-sm font-semibold text-[#f3f4f6] mb-4">Status Breakdown</p>
          <div className="space-y-3.5">
            {byStatus.map(s=>(
              <div key={s.id}>
                <div className="flex justify-between mb-1.5">
                  <span style={{color:s.color}} className="text-[12px] font-semibold">{s.label}</span>
                  <span className="text-[10px] text-[#6b7280] tabular-nums">{s.count} items · {s.pts}pts</span>
                </div>
                <div className="h-2 bg-[#16181f] rounded-full overflow-hidden">
                  <div style={{width:`${total?s.count/total*100:0}%`,background:s.color+"90"}} className="h-full rounded-full transition-all duration-700"/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Type + Priority */}
        <div className="bg-[#111318] rounded-xl border border-[rgba(255,255,255,0.07)] p-5 shadow-card">
          <p className="text-sm font-semibold text-[#f3f4f6] mb-4">Distribution</p>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-widest mb-3">By Type</p>
              {byType.map(({t,count})=>{
                const tc=TYPE[t]||TYPE.task;
                return (
                  <div key={t} className="flex items-center gap-2 mb-2">
                    <Chip className={tc.bg}>{tc.icon}</Chip>
                    <span className="text-[12px] text-[#9ca3af] capitalize flex-1">{t}</span>
                    <span className="text-[12px] font-semibold text-[#d1d5db] tabular-nums">{count}</span>
                    <div className="w-16 h-1.5 bg-[#16181f] rounded-full overflow-hidden">
                      <div style={{width:`${total?count/total*100:0}%`,background:tc.color}} className="h-full rounded-full"/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-widest mb-3">By Priority</p>
              <div className="flex items-end gap-2.5 h-20">
                {byPrio.map(({p,cfg,count})=>{
                  const maxC=Math.max(...byPrio.map(b=>b.count),1);
                  return (
                    <div key={p} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-bold" style={{color:cfg.color}}>{count}</span>
                      <div style={{height:`${Math.max(count?count/maxC*60:0,3)}px`,background:cfg.color+"30",borderTop:`2px solid ${cfg.color}60`}} className="w-full rounded-t-md transition-all duration-700"/>
                      <span className="text-[8px] text-[#6b7280] font-semibold uppercase">{p.slice(0,3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function ItemModal({item,items,onClose,onUpdate,onDelete,notify}) {
  const [tab,setTab]=useState("overview");
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState({title:item.title,description:item.description||"",status:item.status,priority:item.priority,points:item.points,assignee:item.assignee||""});
  const [newComment,setNewComment]=useState("");
  const [newCrit,setNewCrit]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const [aiResult,setAiResult]=useState(null);
  const tc=TYPE[item.type]||TYPE.task, pc=PRIO[item.priority]||PRIO.medium, col=colById(item.status);
  const set=(k,v)=>setDraft(d=>({...d,[k]:v}));
  const saveEdit=()=>{onUpdate(draft);setEditing(false);notify("Saved");};
  const toggleCrit=cid=>{onUpdate({criteria:item.criteria.map(c=>c.id===cid?{...c,done:!c.done}:c)});notify("Updated");};
  const addCrit=()=>{if(!newCrit.trim())return;onUpdate({criteria:[...item.criteria,{id:"c"+mkId(),text:newCrit.trim(),done:false}]});setNewCrit("");notify("Added");};
  const delCrit=cid=>onUpdate({criteria:item.criteria.filter(c=>c.id!==cid)});
  const postComment=()=>{if(!newComment.trim())return;onUpdate({comments:[...(item.comments||[]),{id:"cm"+mkId(),user:"u1",text:newComment.trim(),ts:new Date().toISOString()}]});setNewComment("");notify("Posted");};
  const approve=(aid,status)=>{onUpdate({approvers:item.approvers.map(a=>a.id===aid?{...a,status}:a)});notify(status==="approved"?"Approved ✓":"Rejected");};
  const addApprover=uid=>{if(item.approvers.find(a=>a.user===uid)){notify("Already added","error");return;}onUpdate({approvers:[...item.approvers,{id:"a"+mkId(),user:uid,status:"pending"}]});notify("Approver added");};
  const removeApprover=aid=>{onUpdate({approvers:item.approvers.filter(a=>a.id!==aid)});notify("Removed");};
  const clearBlockers=()=>{onUpdate({blockers:[]});notify("Blockers cleared");};
  const runAI=async action=>{
    setAiLoading(true);setAiResult(null);await new Promise(r=>setTimeout(r,1000));
    const res={generate_criteria:{type:"list",label:"Suggested Acceptance Criteria",items:["Works for all user roles and permissions","API response time < 2s under normal load","Unit test coverage ≥ 85%","Error states handled with clear user messaging","WCAG 2.1 AA accessibility compliant","Responsive across mobile breakpoints","Rollback plan documented and tested"]},estimate_points:{type:"text",label:"AI Estimate",content:"Recommended: 5 story points\n\nBased on 3 similar LWC+Apex stories averaging 4.7pts this sprint. Standard integration pattern, but DOM observer adds complexity (+1pt). Consider splitting if scope expands."},identify_blockers:{type:"list",label:"Identified Risks",items:["Aman at 96% sprint capacity — consider reassignment","embeddedservice_bootstrap timing dependency not fully handled","No rollback plan for Omni-Channel config changes","Firefox CSS regression flagged in comments — unresolved"]}};
    setAiResult(res[action]);setAiLoading(false);
  };
  const TABS=[{id:"overview",l:"Overview"},{id:"criteria",l:`Criteria (${item.criteria?.length||0})`},{id:"approvers",l:`Approvers (${item.approvers?.length||0})`},{id:"comments",l:`Comments (${item.comments?.length||0})`},{id:"blockers",l:`Blockers (${item.blockers?.length||0})`},{id:"ai",l:"✦ AI"}];
  const Row=({label,val})=>(
    <div><p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.08em] mb-1.5">{label}</p>{val}</div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-[#070809]/80 backdrop-blur-sm anim-fade-in" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-[#111318] rounded-2xl border border-[rgba(255,255,255,0.09)] shadow-modal w-full max-w-3xl max-h-[90vh] flex flex-col anim-scale-in">

        {/* Modal header */}
        <div className="px-6 pt-5 pb-0 border-b border-[rgba(255,255,255,0.07)] flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Chip className={tc.bg}>{tc.icon} {tc.label}</Chip>
            <Chip className={pc.bg}>{pc.label}</Chip>
            {col&&<Chip style={{color:col.color,borderColor:col.color+"40",background:col.color+"12"}}>{col.label}</Chip>}
            <code className="ml-auto text-[10px] text-[#6b7280] font-mono">#{item.id}</code>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#f3f4f6] hover:bg-white/[0.06] transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          {editing
            ?<input value={draft.title} onChange={e=>set("title",e.target.value)} className="text-lg font-semibold w-full bg-transparent border-b border-[#7c6af7] outline-none pb-2 mb-3 text-[#f3f4f6]"/>
            :<h2 onClick={()=>setEditing(true)} className="text-[17px] font-semibold text-[#f3f4f6] mb-3 cursor-text hover:text-white transition-colors">{item.title}</h2>
          }
          <div className="flex gap-0">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2.5 text-[12px] font-medium border-b-2 transition-all whitespace-nowrap ${tab===t.id?"border-[#7c6af7] text-[#a89cf7]":"border-transparent text-[#6b7280] hover:text-[#9ca3af]"}`}>{t.l}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-5">
          {tab==="overview"&&(
            <div className="flex gap-6">
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.08em] mb-2">Description</p>
                {editing
                  ?<textarea value={draft.description} onChange={e=>set("description",e.target.value)} rows={5} className="w-full bg-[#0d0e14] border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-3 text-sm text-[#f3f4f6] focus:border-[#7c6af7]/50 outline-none resize-none leading-relaxed"/>
                  :<p className="text-[13px] text-[#9ca3af] leading-relaxed">{item.description||<em className="text-[#6b7280]">No description yet.</em>}</p>
                }
              </div>
              <div className="w-44 flex-shrink-0 space-y-4">
                <Row label="Status"   val={editing?<Select value={draft.status} onChange={e=>set("status",e.target.value)} className="w-full text-xs py-1.5">{COLS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</Select>:col&&<span style={{color:col.color}} className="text-[12px] font-semibold">{col.label}</span>}/>
                <Row label="Priority" val={editing?<Select value={draft.priority} onChange={e=>set("priority",e.target.value)} className="w-full text-xs py-1.5">{Object.entries(PRIO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</Select>:<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${pc.dot}`}/><span style={{color:pc.color}} className="text-[12px] font-semibold">{pc.label}</span></div>}/>
                <Row label="Points"   val={editing?<Input type="number" value={draft.points} onChange={e=>set("points",+e.target.value)} className="w-full text-xs py-1.5"/>:<span className="text-[12px] font-semibold text-[#d1d5db]">{item.points} pts</span>}/>
                <Row label="Assignee" val={editing?<Select value={draft.assignee} onChange={e=>set("assignee",e.target.value)} className="w-full text-xs py-1.5"><option value="">Unassigned</option>{USERS.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</Select>:item.assignee?<div className="flex items-center gap-2"><Avatar userId={item.assignee} size={6}/><span className="text-[12px] text-[#d1d5db]">{userById(item.assignee)?.name}</span></div>:<span className="text-[#6b7280] text-[12px]">Unassigned</span>}/>
                <Row label="Labels" val={<div className="flex gap-1 flex-wrap">{(item.labels||[]).map(lid=>{const l=labelById(lid);return l?<Chip key={lid} className={l.style}>{l.name}</Chip>:null;})}</div>}/>
              </div>
            </div>
          )}

          {tab==="criteria"&&(
            <div>
              {item.criteria?.length===0&&<p className="text-sm text-[#6b7280] mb-4">No criteria yet.</p>}
              <div className="space-y-2 mb-4">
                {item.criteria?.map(c=>(
                  <div key={c.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${c.done?"bg-[#2dd4a0]/[0.05] border-[#2dd4a0]/20":"bg-[#16181f] border-[rgba(255,255,255,0.06)]"}`}>
                    <button onClick={()=>toggleCrit(c.id)} className={`w-4.5 h-4.5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border transition-all flex-none ${c.done?"bg-[#2dd4a0] border-[#2dd4a0] text-[#0d0e14]":"border-[rgba(255,255,255,0.12)] hover:border-[#2dd4a0]/50"}`} style={{width:18,height:18}}>
                      {c.done&&<svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                    </button>
                    <span className={`flex-1 text-[13px] leading-relaxed ${c.done?"line-through text-[#6b7280]":"text-[#d1d5db]"}`}>{c.text}</span>
                    <button onClick={()=>delCrit(c.id)} className="text-[#6b7280] hover:text-rose-400 text-lg leading-none transition-colors flex-shrink-0">×</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newCrit} onChange={e=>setNewCrit(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCrit()} placeholder="Add acceptance criterion… Enter to add" className="flex-1"/>
                <PillBtn onClick={addCrit}>Add</PillBtn>
              </div>
              {item.criteria?.length>0&&(
                <div className="mt-4 p-3.5 bg-[#7c6af7]/[0.06] border border-[#7c6af7]/20 rounded-xl">
                  <div className="flex justify-between mb-2 text-[12px]"><span className="font-semibold text-[#a89cf7]">Progress</span><span className="text-[#7c6af7] font-bold tabular-nums">{item.criteria.filter(c=>c.done).length}/{item.criteria.length} · {Math.round(item.criteria.filter(c=>c.done).length/item.criteria.length*100)}%</span></div>
                  <div className="h-1.5 bg-[#16181f] rounded-full overflow-hidden"><div className="h-full bg-[#7c6af7] rounded-full transition-all" style={{width:`${item.criteria.filter(c=>c.done).length/item.criteria.length*100}%`}}/></div>
                </div>
              )}
            </div>
          )}

          {tab==="approvers"&&(
            <div>
              {item.approvers?.length===0&&<p className="text-sm text-[#6b7280] mb-4">No approvers assigned.</p>}
              <div className="space-y-2.5 mb-5">
                {item.approvers?.map(a=>{const u=userById(a.user);return(
                  <div key={a.id} className="flex items-center gap-3 p-3.5 bg-[#16181f] rounded-xl border border-[rgba(255,255,255,0.07)]">
                    <Avatar userId={a.user} size={8}/>
                    <div className="flex-1"><p className="text-[13px] font-semibold text-[#f3f4f6]">{u?.name}</p></div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${a.status==="approved"?"bg-[#2dd4a0]/10 text-[#2dd4a0] border-[#2dd4a0]/25":a.status==="rejected"?"bg-rose-500/10 text-rose-400 border-rose-500/25":"bg-white/5 text-[#9ca3af] border-[rgba(255,255,255,0.08)]"}`}>{a.status.toUpperCase()}</span>
                    {a.status==="pending"&&<><PillBtn size="sm" color="jade" onClick={()=>approve(a.id,"approved")}>Approve</PillBtn><PillBtn size="sm" color="rose" onClick={()=>approve(a.id,"rejected")}>Reject</PillBtn></>}
                    <button onClick={()=>removeApprover(a.id)} className="text-[#6b7280] hover:text-rose-400 text-lg leading-none transition-colors">×</button>
                  </div>
                );})}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.08em] mb-2.5">Add Approver</p>
                <div className="flex flex-wrap gap-2">
                  {USERS.filter(u=>!item.approvers.find(a=>a.user===u.id)).map(u=>(
                    <button key={u.id} onClick={()=>addApprover(u.id)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#16181f] border border-[rgba(255,255,255,0.07)] hover:border-[#7c6af7]/40 hover:bg-[#7c6af7]/[0.06] transition-all text-[12px] font-medium text-[#9ca3af] hover:text-[#a89cf7]">
                      <Avatar userId={u.id} size={5}/>{u.name}
                    </button>
                  ))}
                  {USERS.every(u=>item.approvers.find(a=>a.user===u.id))&&<p className="text-[12px] text-[#6b7280]">All team members added.</p>}
                </div>
              </div>
            </div>
          )}

          {tab==="comments"&&(
            <div>
              {item.comments?.length===0&&<p className="text-sm text-[#6b7280] mb-4">No comments yet.</p>}
              <div className="space-y-4 mb-5">
                {item.comments?.map(c=>{const u=userById(c.user);return(
                  <div key={c.id} className="flex gap-3">
                    <Avatar userId={c.user} size={7}/>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5"><span className="text-[13px] font-semibold text-[#f3f4f6]">{u?.name}</span><span className="text-[11px] text-[#6b7280]">{fmtTs(c.ts)}</span></div>
                      <div className="bg-[#16181f] border border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-3 text-[13px] text-[#d1d5db] leading-relaxed">{c.text}</div>
                    </div>
                  </div>
                );})}
              </div>
              <div className="flex gap-3">
                <Avatar userId="u1" size={7}/>
                <div className="flex-1">
                  <textarea value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();postComment();}}} rows={3} placeholder="Leave a comment… Enter to post" className="w-full bg-[#0d0e14] border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-3 text-[13px] text-[#f3f4f6] focus:border-[#7c6af7]/50 outline-none resize-none placeholder-[#6b7280]"/>
                  <PillBtn className="mt-2" onClick={postComment}>Post</PillBtn>
                </div>
              </div>
            </div>
          )}

          {tab==="blockers"&&(
            <div>
              {item.blockers?.length===0
                ?<div className="flex items-center gap-3 p-4 bg-[#2dd4a0]/[0.06] border border-[#2dd4a0]/20 rounded-xl text-[#2dd4a0] text-[13px] font-medium"><span>✓</span>No blockers — this item can proceed!</div>
                :<div className="space-y-2.5">
                  {item.blockers?.map(bid=>{const bl=items.find(i=>i.id===bid);if(!bl)return null;const btc=TYPE[bl.type]||TYPE.task;return(
                    <div key={bid} className="flex items-center gap-3 p-4 bg-rose-500/[0.06] border border-rose-500/20 rounded-xl">
                      <span className="text-rose-400 text-lg">◉</span>
                      <div className="flex-1"><p className="text-[13px] font-semibold text-[#f3f4f6]">{bl.title}</p><p className="text-[11px] text-[#6b7280] mt-0.5">{colById(bl.status)?.label} · {bl.assignee?userById(bl.assignee)?.name:"Unassigned"}</p></div>
                      <Chip className={btc.bg}>{btc.icon} {btc.label}</Chip>
                    </div>
                  );})}
                  <PillBtn color="surface" className="mt-3" onClick={clearBlockers}>✕ Clear All Blockers</PillBtn>
                </div>
              }
            </div>
          )}

          {tab==="ai"&&(
            <div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.07)] overflow-hidden mb-5" style={{background:"linear-gradient(135deg,#0d0e14 0%,#111320 100%)"}}>
                <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-2 mb-1"><span className="text-[#a89cf7]">✦</span><span className="text-sm font-semibold text-[#f3f4f6]">AI Assistant</span></div>
                  <p className="text-[11px] text-[#6b7280]">Generate intelligent insights for this work item.</p>
                </div>
                <div className="p-5 flex gap-2.5 flex-wrap">
                  {[["generate_criteria","📋 Criteria"],["estimate_points","◆ Estimate"],["identify_blockers","⚠ Risks"]].map(([a,l])=>(
                    <button key={a} onClick={()=>runAI(a)} disabled={aiLoading} className="px-4 py-2 bg-[#7c6af7]/10 border border-[#7c6af7]/25 text-[#a89cf7] rounded-lg text-[12px] font-semibold hover:bg-[#7c6af7]/20 transition-colors disabled:opacity-40">{l}</button>
                  ))}
                </div>
              </div>
              {aiLoading&&(
                <div className="flex flex-col items-center py-12 gap-3">
                  <div className="w-7 h-7 rounded-full border-2 border-[#7c6af7]/20 border-t-[#7c6af7] spin"/>
                  <span className="text-[12px] text-[#6b7280]">Generating…</span>
                </div>
              )}
              {aiResult&&!aiLoading&&(
                <div className="bg-[#16181f] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 anim-fade-up">
                  <p className="text-[11px] font-bold text-[#7c6af7] uppercase tracking-[0.08em] mb-3">{aiResult.label}</p>
                  {aiResult.type==="list"?<ul className="space-y-2">{aiResult.items.map((t,i)=><li key={i} className="flex items-start gap-2.5 text-[13px] text-[#d1d5db]"><span className="text-[#7c6af7] mt-1 flex-shrink-0 text-[8px]">◆</span>{t}</li>)}</ul>:<pre className="text-[13px] text-[#d1d5db] whitespace-pre-wrap font-sans leading-relaxed">{aiResult.content}</pre>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[rgba(255,255,255,0.07)] bg-[#0d0e14]/40 rounded-b-2xl flex items-center gap-2 flex-shrink-0">
          {editing?(
            <><PillBtn onClick={saveEdit}>Save Changes</PillBtn><PillBtn color="ghost" onClick={()=>setEditing(false)}>Cancel</PillBtn></>
          ):(
            <><PillBtn color="surface" onClick={()=>setEditing(true)}>✏ Edit</PillBtn>
            {item.status!=="done"&&<PillBtn color="jade" onClick={()=>{onUpdate({status:"done"});notify("Marked done 🎉");onClose();}}>✓ Mark Done</PillBtn>}
            {item.status!=="in_review"&&item.status!=="done"&&<PillBtn color="amber" onClick={()=>{onUpdate({status:"in_review"});notify("Moved to Review");onClose();}}>◉ To Review</PillBtn>}
            <div className="ml-auto"><PillBtn color="danger" onClick={()=>{if(window.confirm("Delete this item?"))onDelete();}}>Delete</PillBtn></div></>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TEAM VIEW ────────────────────────────────────────────────────────────────
function TeamView({ teamMembers, setTeamMembers, notify }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:"", role:"", email:"", color:"#6366f1" });
  const mkId = () => Math.random().toString(36).slice(2,9);

  const COLORS = ["#6366f1","#8b5cf6","#059669","#f59e0b","#ef4444","#0ea5e9","#ec4899","#14b8a6"];
  const ROLES  = ["Lead Developer","Senior Developer","Frontend Developer","Backend Developer","DevOps Engineer","Product Manager","QA Engineer","Data Analyst","Designer","Scrum Master"];

  const initials = name => name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

  const openAdd = () => { setForm({name:"",role:"",email:"",color:COLORS[teamMembers.length % COLORS.length]}); setEditId(null); setShowAdd(true); };
  const openEdit = m  => { setForm({name:m.name,role:m.role,email:m.email,color:m.color}); setEditId(m.id); setShowAdd(true); };
  const save = () => {
    if (!form.name.trim() || !form.email.trim()) { notify("Name and email required","error"); return; }
    if (editId) {
      setTeamMembers(p=>p.map(m=>m.id===editId?{...m,...form,avatar:initials(form.name)}:m));
      notify("Member updated");
    } else {
      setTeamMembers(p=>[...p,{id:"u"+mkId(),...form,avatar:initials(form.name),active:true}]);
      notify("Member added");
    }
    setShowAdd(false);
  };
  const toggle = id => { setTeamMembers(p=>p.map(m=>m.id===id?{...m,active:!m.active}:m)); notify("Updated"); };
  const remove = id => { if(window.confirm("Remove this team member?")) { setTeamMembers(p=>p.filter(m=>m.id!==id)); notify("Removed"); } };

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-[#f3f4f6]">Team Members</h2>
          <p className="text-[12px] text-[#9ca3af] mt-0.5">{teamMembers.filter(m=>m.active).length} active · {teamMembers.length} total</p>
        </div>
        <button onClick={openAdd} className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#7c6af7] hover:bg-[#6b5ce7] text-white rounded-lg text-sm font-semibold transition-colors">
          + Add Member
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3">
        {teamMembers.map(m => (
          <div key={m.id} className={`bg-[#111318] rounded-xl border p-4 transition-all ${m.active?"border-[rgba(255,255,255,0.09)]":"border-[rgba(255,255,255,0.04)] opacity-50"}`}>
            <div className="flex items-start gap-3 mb-3">
              <div style={{background:m.color,width:44,height:44,fontSize:15}} className="rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 ring-1 ring-white/10">
                {m.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#f3f4f6] truncate">{m.name}</p>
                <p className="text-[11px] text-[#9ca3af] truncate">{m.role}</p>
              </div>
            </div>
            <p className="text-[11px] text-[#6b7280] mb-3 truncate">{m.email}</p>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.active?"bg-[#2dd4a0]/10 text-[#2dd4a0] border-[#2dd4a0]/25":"bg-white/5 text-[#6b7280] border-white/10"}`}>
                {m.active ? "Active" : "Inactive"}
              </span>
              <div className="ml-auto flex gap-1">
                <button onClick={()=>openEdit(m)} className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#a89cf7] hover:bg-[#7c6af7]/10 transition-all text-sm" title="Edit">✏</button>
                <button onClick={()=>toggle(m.id)} className={`p-1.5 rounded-lg transition-all text-sm ${m.active?"text-[#6b7280] hover:text-[#f5a623] hover:bg-[#f5a623]/10":"text-[#6b7280] hover:text-[#2dd4a0] hover:bg-[#2dd4a0]/10"}`} title={m.active?"Deactivate":"Activate"}>
                  {m.active ? "⊘" : "✓"}
                </button>
                <button onClick={()=>remove(m.id)} className="p-1.5 rounded-lg text-[#6b7280] hover:text-rose-400 hover:bg-rose-500/10 transition-all text-sm" title="Remove">🗑</button>
              </div>
            </div>
          </div>
        ))}

        {/* Add card placeholder */}
        <button onClick={openAdd} className="bg-[#111318] rounded-xl border border-dashed border-[rgba(255,255,255,0.08)] p-4 flex flex-col items-center justify-center gap-2 text-[#6b7280] hover:text-[#7c6af7] hover:border-[#7c6af7]/30 hover:bg-[#7c6af7]/[0.03] transition-all min-h-[140px]">
          <span className="text-3xl font-light">+</span>
          <span className="text-[12px] font-medium">Add team member</span>
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-[#070809]/80 backdrop-blur-sm" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="bg-[#111318] rounded-2xl border border-[rgba(255,255,255,0.09)] shadow-modal w-full max-w-md p-6" style={{animation:"scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)"}}>
            <div className="flex items-center gap-3 mb-5">
              <div style={{background:form.color,width:40,height:40,fontSize:14}} className="rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                {form.name ? initials(form.name) : "?"}
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[#f3f4f6]">{editId ? "Edit Member" : "Add Team Member"}</h3>
                <p className="text-[11px] text-[#9ca3af]">Fill in the details below</p>
              </div>
              <button onClick={()=>setShowAdd(false)} className="ml-auto text-[#6b7280] hover:text-[#f3f4f6] text-lg transition-colors">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Full Name *</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. John Smith" className="w-full bg-[#0d0e14] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f3f4f6] placeholder-[#6b7280] focus:border-[#7c6af7]/60 outline-none transition-all"/>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Email *</label>
                <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} type="email" placeholder="john@company.com" className="w-full bg-[#0d0e14] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f3f4f6] placeholder-[#6b7280] focus:border-[#7c6af7]/60 outline-none transition-all"/>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Role</label>
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} className="w-full bg-[#0d0e14] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f3f4f6] focus:border-[#7c6af7]/60 outline-none">
                  <option value="">Select role…</option>
                  {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Avatar Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c=>(
                    <button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{background:c,width:28,height:28,outline:form.color===c?`2px solid ${c}`:"none",outlineOffset:2}} className="rounded-lg transition-transform hover:scale-110 flex-shrink-0"/>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={save} className="flex-1 bg-[#7c6af7] hover:bg-[#6b5ce7] text-white rounded-lg py-2 text-sm font-semibold transition-colors">
                {editId ? "Save Changes" : "Add Member"}
              </button>
              <button onClick={()=>setShowAdd(false)} className="px-4 py-2 bg-[#16181f] hover:bg-[#1a1d27] border border-[rgba(255,255,255,0.08)] text-[#9ca3af] rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CREATE SPRINT MODAL ─────────────────────────────────────────────────────
function CreateSprintModal({ projects, onClose, onCreated, notify }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    project_id: "",
    name: "",
    goal: "",
    start_date: "",
    end_date: "",
    capacity: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.project_id || !form.name?.trim()) {
      notify("Project and sprint name are required", "error");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: form.project_id,
          name: form.name.trim(),
          goal: form.goal.trim() || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          capacity: form.capacity ? parseInt(form.capacity, 10) : 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Failed to create sprint (${res.status})`);
        return;
      }
      onCreated();
    } catch (err) {
      setError(err.message || "Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-[#070809]/80 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#111318] rounded-2xl border border-[rgba(255,255,255,0.09)] shadow-modal w-full max-w-md p-6" style={{ animation: "scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#7c6af7]/20 flex items-center justify-center text-[#a89cf7] text-lg font-bold">▤</div>
          <div>
            <h3 className="text-[15px] font-semibold text-[#f3f4f6]">Create Sprint</h3>
            <p className="text-[11px] text-[#9ca3af]">Add a new time-boxed sprint to a project</p>
          </div>
          <button onClick={onClose} className="ml-auto text-[#6b7280] hover:text-[#f3f4f6] text-lg transition-colors">×</button>
        </div>

        {projects.length === 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[12px] text-amber-200">
            No projects loaded. Start the backend and run <code className="opacity-90">npm run db:seed</code> to create sample projects, or create a project via the API.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Project *</label>
            <select value={form.project_id} onChange={e => set("project_id", e.target.value)} className="w-full bg-[#0d0e14] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f3f4f6] focus:border-[#7c6af7]/60 outline-none" disabled={projects.length === 0}>
              <option value="">Select project…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Sprint name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Sprint 15" className="w-full bg-[#0d0e14] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f3f4f6] placeholder-[#6b7280] focus:border-[#7c6af7]/60 outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Goal (optional)</label>
            <textarea value={form.goal} onChange={e => set("goal", e.target.value)} placeholder="What should this sprint achieve?" rows={2} className="w-full bg-[#0d0e14] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f3f4f6] placeholder-[#6b7280] focus:border-[#7c6af7]/60 outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Start date</label>
              <input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="w-full bg-[#0d0e14] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f3f4f6] focus:border-[#7c6af7]/60 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">End date</label>
              <input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className="w-full bg-[#0d0e14] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f3f4f6] focus:border-[#7c6af7]/60 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Capacity (story points)</label>
            <input type="number" min={0} value={form.capacity} onChange={e => set("capacity", e.target.value)} placeholder="0" className="w-full bg-[#0d0e14] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#f3f4f6] placeholder-[#6b7280] focus:border-[#7c6af7]/60 outline-none" />
          </div>
        </div>

        {error && <p className="mt-3 text-[12px] text-rose-400">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={submit} disabled={loading || projects.length === 0} className="flex-1 bg-[#7c6af7] hover:bg-[#6b5ce7] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold transition-colors">
            {loading ? "Creating…" : "Create Sprint"}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-[#16181f] hover:bg-[#1a1d27] border border-[rgba(255,255,255,0.08)] text-[#9ca3af] rounded-lg text-sm font-medium transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
