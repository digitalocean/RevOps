import { useState, useRef, useCallback, useEffect, useMemo, createContext, useContext } from "react";

// ─── DESIGN TOKENS (#EDE8D0 tone) ─────────────────────────────────────────────
const T = {
  surface:  "bg-[#F3F0E0]",
  raised:   "bg-[#FAF8F2]",
  overlay:  "bg-white",
  border:   "border-[rgba(0,0,0,0.08)]",
  borderSt: "border-[rgba(0,0,0,0.12)]",
  text:     "text-[#1c1917]",
  muted:    "text-[#57534e]",
  dim:      "text-[#78716c]",
};

// ─── DATA ─────────────────────────────────────────────────────────────────────
const toDisplayUser = m => ({ id: m.id, name: m.name, initials: (m.avatar || (m.name||"").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)), hex: m.color || "#6366f1" });
const UsersContext = createContext([]);
const useUsers = () => useContext(UsersContext);
const userByIdFromList = (users, id) => users.find(x => x.id === id);

const LABELS = [];

const COLS = [
  { id:"backlog",     label:"Backlog",     color:"#6b7280", glow:"",             dot:"bg-[#6b7280]",   badge:"text-[#9ca3af]"            },
  { id:"todo",        label:"To Do",       color:"#9ca3af", glow:"",             dot:"bg-[#7a7e99]",   badge:"text-[#d1d5db]"            },
  { id:"in_progress", label:"In Progress", color:"#7c6af7", glow:"rgba(124,106,247,0.2)", dot:"bg-[#7c6af7]", badge:"text-[#7c6af7]" },
  { id:"in_review",   label:"In Review",   color:"#f5a623", glow:"rgba(245,166,35,0.2)",  dot:"bg-[#f5a623]", badge:"text-[#f5a623]" },
  { id:"done",        label:"Done",        color:"#2dd4a0", glow:"rgba(45,212,160,0.2)",  dot:"bg-[#2dd4a0]", badge:"text-[#2dd4a0]" },
];
const DEFAULT_COLUMN_ORDER = COLS.map(c => c.id);
function getBoardColumns(project) {
  const order = project?.board_column_order;
  if (!order || !Array.isArray(order) || order.length === 0) return COLS;
  const byId = Object.fromEntries(COLS.map(c => [c.id, c]));
  return order.map(id => byId[id]).filter(Boolean).concat(COLS.filter(c => !order.includes(c.id)));
}

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
// In dev use same-origin so Vite proxy can forward (avoids browser blocking self-signed API certs)
const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.DEV) ? "" : ((typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:4000");
const daysApart = (a,b) => Math.round((new Date(b)-new Date(a))/86400000);
const fmtTs = iso => iso ? new Date(iso).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "";
const byId = (arr,id) => arr.find(x=>x.id===id);
const colById  = id => byId(COLS,id);
const labelById= id => byId(LABELS,id);

// Map API work item to UI shape (id, type, title, status, priority, points, assignee, labels, criteria, etc.)
function apiItemToUI(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type || 'task',
    title: row.title,
    description: row.description || '',
    status: row.status || 'backlog',
    priority: row.priority || 'medium',
    points: row.points ?? 1,
    assignee: row.assignee_id || '',
    labels: (row.labels || []).map(l => (typeof l === 'object' && l?.id) ? l.id : l),
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    criteria: row.criteria || [],
    criteria_total: row.criteria_total,
    criteria_done: row.criteria_done,
    comment_count: row.comment_count,
    comments: row.comments || [],
    approvers: row.approvers || [],
    blockers: row.blockers || [],
    custom_field_values: row.custom_field_values || {},
  };
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────
function Avatar({ userId, size=6 }) {
  const users = useUsers();
  const u = userByIdFromList(users, userId); if (!u) return null;
  const s = `w-${size} h-${size}`;
  return <div title={u.name} style={{width:size*4,height:size*4,background:u.hex,fontSize:size*1.5}} className="rounded-full flex items-center justify-center text-white font-semibold ring-[1.5px] ring-[rgba(255,255,255,0.1)] flex-shrink-0">{u.initials}</div>;
}

function Chip({ children, className="" }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wide border ${className}`}>{children}</span>;
}

function PillBtn({ children, onClick, color="accent", size="md", disabled=false, className="" }) {
  const colors = {
    accent:  "bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500/40",
    ghost:   "bg-transparent hover:bg-black/5 text-[#57534e] hover:text-[#1c1917] border-transparent",
    surface: "bg-[#e7e2db] hover:bg-[#d6d0c4] text-[#1c1917] border-[rgba(0,0,0,0.08)]",
    jade:    "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-200",
    amber:   "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-200",
    rose:    "bg-rose-100 hover:bg-rose-200 text-rose-700 border-rose-200",
    danger:  "bg-rose-100 hover:bg-rose-500 hover:text-white text-rose-700 border-rose-200",
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
    <div style={{animation:"toast-in 0.3s cubic-bezier(0.16,1,0.3,1)"}} className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ${isErr ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-white border-[rgba(0,0,0,0.08)] text-[#1c1917] shadow-lg"}`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${isErr ? "bg-rose-200 text-rose-600" : "bg-emerald-100 text-emerald-700"}`}>{isErr ? "!" : "✓"}</span>
      {t.msg}
    </div>
  );
}

function Input({ value, onChange, placeholder, className="", onKeyDown, autoFocus=false, type="text" }) {
  return <input type={type} value={value} onChange={onChange} onKeyDown={onKeyDown} autoFocus={autoFocus} placeholder={placeholder} className={`bg-white border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm text-[#1c1917] placeholder-[#78716c] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all outline-none ${className}`}/>;
}

function Select({ value, onChange, children, className="" }) {
  return <select value={value} onChange={onChange} className={`bg-white border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm text-[#1c1917] focus:border-indigo-400 outline-none ${className}`}>{children}</select>;
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [items, setItems] = useState([]);
  const [view, setView] = useState("board");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [showCreateSprintModal, setShowCreateSprintModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [projRes, sprintRes, membersRes, rolesRes, defsRes] = await Promise.all([
          fetch(`${API_BASE}/api/projects`),
          fetch(`${API_BASE}/api/sprints`),
          fetch(`${API_BASE}/api/team-members`),
          fetch(`${API_BASE}/api/roles`),
          fetch(`${API_BASE}/api/custom-field-definitions`),
        ]);
        if (projRes.ok) setProjects(await projRes.json());
        if (sprintRes.ok) setSprints(await sprintRes.json());
        if (membersRes.ok) setTeamMembers(await membersRes.json());
        if (rolesRes.ok) setRoles(await rolesRes.json());
        if (defsRes.ok) setCustomFieldDefinitions(await defsRes.json());
      } catch (_) { /* backend not running or CORS — keep empty */ }
    };
    load();
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects`);
      if (res.ok) setProjects(await res.json());
    } catch (_) {}
  }, []);

  const updateProject = useCallback(async (projectId, patch) => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) await refreshProjects();
      return res.ok;
    } catch (_) { return false; }
  }, [refreshProjects]);

  const refreshCustomFieldDefinitions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/custom-field-definitions`);
      if (res.ok) setCustomFieldDefinitions(await res.json());
    } catch (_) {}
  }, []);

  const refreshSprints = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sprints`);
      if (res.ok) setSprints(await res.json());
    } catch (_) {}
  }, []);

  // Load items when a sprint is selected
  useEffect(() => {
    if (!selectedSprintId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/items?sprint_id=${selectedSprintId}`);
        if (!res.ok || cancelled) return;
        const rows = await res.json();
        setItems(rows.map(apiItemToUI).filter(Boolean));
      } catch (_) {
        if (!cancelled) setItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSprintId]);

  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
  const selectedSprint = selectedSprintId ? sprints.find(s => s.id === selectedSprintId) : null;
  const sprintsForProject = selectedProjectId ? sprints.filter(s => s.project_id === selectedProjectId) : [];
  const displayUsers = useMemo(() => teamMembers.map(toDisplayUser), [teamMembers]);

  const refreshTeamMembers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/team-members`);
      if (res.ok) setTeamMembers(await res.json());
    } catch (_) {}
  }, []);
  const refreshRoles = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/roles`);
      if (res.ok) setRoles(await res.json());
    } catch (_) {}
  }, []);

  const refreshItems = useCallback(async () => {
    if (!selectedSprintId) return;
    try {
      const res = await fetch(`${API_BASE}/api/items?sprint_id=${selectedSprintId}`);
      if (res.ok) setItems((await res.json()).map(apiItemToUI).filter(Boolean));
    } catch (_) {}
  }, [selectedSprintId]);

  const notify = useCallback((msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),2500); }, []);
  const updateItem = useCallback(async (id, patch) => {
    const uiPatch = { ...patch };
    if (uiPatch.assignee !== undefined) {
      uiPatch.assignee_id = (uiPatch.assignee && String(uiPatch.assignee).trim()) ? uiPatch.assignee : null;
      delete uiPatch.assignee;
    }
    setItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i));
    if (selectedSprintId && typeof fetch === "function") {
      try {
        const body = { ...uiPatch };
        if (body.criteria !== undefined) delete body.criteria;
        if (body.comments !== undefined) delete body.comments;
        if (body.approvers !== undefined) delete body.approvers;
        if (body.blockers !== undefined) delete body.blockers;
        if (body.labels !== undefined) delete body.labels;
        if (body.assignee !== undefined) { body.assignee_id = (body.assignee && String(body.assignee).trim()) ? body.assignee : null; delete body.assignee; }
        const res = await fetch(`${API_BASE}/api/items/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (res.ok) {
          await refreshItems();
        } else {
          const err = await res.json().catch(() => ({}));
          notify(err.error || err.message || `Save failed (${res.status})`, "error");
          await refreshItems();
        }
      } catch (e) {
        notify(e.message || "Could not reach server. Check that the backend is running.", "error");
        await refreshItems();
      }
    }
  }, [selectedSprintId, refreshItems, notify]);
  const deleteItem = useCallback(async (id) => {
    setItems(p=>p.filter(i=>i.id!==id)); setModal(null); notify("Item deleted");
    if (selectedSprintId && typeof fetch === "function") {
      try { await fetch(`${API_BASE}/api/items/${id}`, { method: "DELETE" }); refreshItems(); } catch (_) {}
    }
  }, [notify, selectedSprintId, refreshItems]);
  const addItem = useCallback(async (item) => {
    if (!selectedProjectId || !selectedSprintId) {
      notify("Select a project and sprint in the sidebar first so your work is saved.", "error");
      return;
    }
    if (typeof fetch !== 'function') return;
    try {
      const res = await fetch(`${API_BASE}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId,
          sprint_id: selectedSprintId,
          type: item.type || 'task',
          title: item.title,
          description: item.description || '',
          status: item.status || 'backlog',
          priority: item.priority || 'medium',
          points: item.points ?? 1,
          assignee_id: (item.assignee && String(item.assignee).trim()) ? item.assignee : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await refreshItems();
        notify("Item created");
      } else {
        notify(data.error || data.message || `Failed to create (${res.status})`, "error");
      }
    } catch (e) {
      notify(e.message || "Cannot reach server. Is the backend running?", "error");
    }
  }, [notify, selectedProjectId, selectedSprintId, refreshItems]);

  const filtered = items.filter(i=>(filterType==="all"||i.type===filterType)&&(!search||i.title.toLowerCase().includes(search.toLowerCase())));
  const activeItem = modal ? items.find(i=>i.id===modal) : null;

  const doneCt = items.filter(i=>i.status==="done").length;
  const totalPts = items.reduce((s,i)=>s+i.points,0);
  const donePts = items.filter(i=>i.status==="done").reduce((s,i)=>s+i.points,0);

  return (
    <UsersContext.Provider value={displayUsers}>
    <div className="flex h-screen bg-[#EDE8D0] overflow-hidden text-[#1c1917]">
      <Toast t={toast}/>

      {/* Sidebar */}
      <aside className="w-[240px] flex-shrink-0 flex flex-col border-r border-[rgba(0,0,0,0.08)] bg-[#F3F0E0] shadow-sm">
        <div className="px-4 py-4 border-b border-[rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <span className="text-base font-semibold text-[#1c1917]">AgileOps</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-[#78716c] px-2 py-2 tracking-wider uppercase">Workspace</p>
          {[["board","⊞","Board"],["list","≡","List"],["gantt","▤","Gantt"],["metrics","◈","Metrics"],["team","◉","Team"]].map(([v,ic,lb])=>(
            <button key={v} onClick={()=>setView(v)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group ${view===v ? "bg-indigo-500/12 text-indigo-700" : "text-[#57534e] hover:text-[#1c1917] hover:bg-[rgba(0,0,0,0.04)]"}`}>
              <span className={`text-base ${view===v ? "text-indigo-600" : "text-[#78716c] group-hover:text-[#57534e]"}`}>{ic}</span>
              {lb}
              {view===v && <span className="ml-auto w-1 h-4 rounded-full bg-indigo-500"/>}
            </button>
          ))}

          <p className="text-[10px] font-semibold text-[#78716c] px-2 py-2 mt-4 tracking-wider uppercase">Projects</p>
          <div className="flex gap-1.5 mb-2">
            <button onClick={()=>setShowCreateProjectModal(true)} className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors" title="New project">+ New project</button>
            {projects.length > 0 && (
              <button onClick={()=>setShowCreateSprintModal(true)} className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg border border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-xs font-medium transition-colors" title="New sprint">+ Sprint</button>
            )}
          </div>
          {projects.length === 0 && <p className="px-2 py-1 text-xs text-[#78716c]">Create a project above, then add sprints.</p>}
          {projects.map((p) => (
            <div key={p.id} className="mt-0.5">
              <button
                onClick={() => { setSelectedProjectId(p.id); setSelectedSprintId(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-left transition-all ${selectedProjectId === p.id ? "bg-[#E2DCC5] text-[#1c1917]" : "text-[#57534e] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1c1917]"}`}
              >
                <div style={{background: p.color || "#6366f1"}} className="w-2.5 h-2.5 rounded flex-shrink-0"/>
                <span className="truncate flex-1">{p.name}</span>
                {p.status && p.status !== "active" && <span className="text-[9px] uppercase text-[#78716c] flex-shrink-0">{p.status}</span>}
              </button>
              {selectedProjectId === p.id && (
                <div className="ml-3 mt-1 pl-2 border-l-2 border-[rgba(0,0,0,0.08)] space-y-0.5">
                  {sprintsForProject.length === 0 && <p className="text-[11px] text-[#78716c] py-1">No sprints. Add one below.</p>}
                  {sprintsForProject.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSprintId(s.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-left transition-all ${selectedSprintId === s.id ? "bg-indigo-500/15 text-indigo-800 font-medium" : "text-[#57534e] hover:bg-[rgba(0,0,0,0.04)]"}`}
                    >
                      <span className="truncate">{s.name}</span>
                    </button>
                  ))}
                  <button onClick={()=>setShowCreateSprintModal(true)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-indigo-600 hover:bg-indigo-500/10 font-medium">
                    + New sprint
                  </button>
                </div>
              )}
            </div>
          ))}

          <p className="text-[10px] font-semibold text-[#78716c] px-2 py-2 mt-5 tracking-wider uppercase">Admin center</p>
          <div className="space-y-0.5">
            <button onClick={()=>setShowSettingsModal(true)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-left text-[#57534e] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1c1917] transition-all">
              <span className="text-base text-[#78716c]">⚙</span> Custom fields
            </button>
            <button onClick={()=>setView("team")} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-left text-[#57534e] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1c1917] transition-all">
              <span className="text-base text-[#78716c]">◉</span> Team & roles
            </button>
          </div>
        </nav>

        <div className="px-3 py-3 border-t border-[rgba(0,0,0,0.06)] bg-[#FAF8F2]">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar userId="u1" size={7}/>
            <div><p className="text-[12px] font-semibold text-[#1c1917]">You</p><p className="text-[10px] text-[#78716c]">Admin</p></div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-[#F3F0E0]">
        {/* Topbar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[rgba(0,0,0,0.08)] bg-[#FAF8F2] flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-[#57534e]">
            {selectedProject ? <span className="font-medium text-[#1c1917]">{selectedProject.name}</span> : <span>Select a project</span>}
            {selectedProject && <span className="text-[#c4bdb2]">/</span>}
            {selectedSprint ? <span className="font-semibold text-indigo-600">{selectedSprint.name}</span> : selectedProject && <span className="text-[#78716c]">Select a sprint</span>}
          </div>
          <div className="flex-1"/>
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716c]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="pl-9 pr-3 py-2 text-[13px] bg-white border border-[rgba(0,0,0,0.08)] rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 text-[#1c1917] placeholder-[#78716c] w-48 transition-all"/>
          </div>
          <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-[13px] text-[#57534e] outline-none focus:border-indigo-400">
            <option value="all">All types</option>
            <option value="epic">⚡ Epic</option><option value="story">◆ Story</option>
            <option value="bug">● Bug</option><option value="task">✓ Task</option>
          </select>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-1 gap-0.5 shadow-sm">
              {[["board","⊞"],["list","≡"],["gantt","▤"],["metrics","◈"],["team","◉"]].map(([v,ic])=>(
                <button key={v} onClick={()=>setView(v)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view===v?"bg-indigo-500 text-white":"text-[#57534e] hover:bg-[rgba(0,0,0,0.04)]"}`}>{ic} {v.charAt(0).toUpperCase()+v.slice(1)}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Sprint header */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-[rgba(0,0,0,0.06)] bg-[#EDE8D0] flex-shrink-0">
          <div className="flex items-center gap-2">
            {selectedSprint ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"/>
                <span className="text-sm font-semibold text-[#1c1917]">{selectedSprint.name}</span>
                <span className="text-[12px] text-[#78716c]">
                  {selectedSprint.start_date && selectedSprint.end_date ? `${new Date(selectedSprint.start_date).toLocaleDateString('en-US',{month:'short'})} ${new Date(selectedSprint.start_date).getDate()}–${new Date(selectedSprint.end_date).getDate()}` : ''}
                </span>
              </>
            ) : (
              <span className="text-sm text-[#78716c]">Select a project and sprint in the sidebar</span>
            )}
          </div>
          {selectedSprint?.goal && <span className="text-[#57534e] text-sm">|</span>}
          {selectedSprint?.goal && <span className="text-[13px] text-[#57534e] truncate max-w-md">{selectedSprint.goal}</span>}
          <div className="ml-auto flex items-center gap-2">
            {selectedProject && (
              <button onClick={()=>setShowCreateSprintModal(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 text-[13px] font-medium hover:bg-indigo-100 transition-colors">
                + New sprint
              </button>
            )}
            {[
              [`${doneCt}/${items.length}`,"items", "#6366f1"],
              [`${donePts}/${totalPts}`,"pts", "#059669"],
              [`${items.length ? Math.round(doneCt/items.length*100) : 0}%`,"done", "#d97706"],
            ].map(([val,lbl,col])=>(
              <div key={lbl} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[rgba(0,0,0,0.08)] shadow-sm">
                <span style={{color:col}} className="text-xs font-bold tabular-nums">{val}</span>
                <span className="text-[11px] text-[#78716c]">{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {view==="board"   && <BoardView   filtered={filtered} items={items} boardColumns={getBoardColumns(selectedProject)} selectedProject={selectedProject} updateProject={updateProject} updateItem={updateItem} addItem={addItem} setModal={setModal} dragId={dragId} dragOver={dragOver} onDragStart={setDragId} onDragOver={setDragOver} onDrop={colId=>{if(dragId){updateItem(dragId,{status:colId});notify(`→ ${colById(colId)?.label}`);}setDragId(null);setDragOver(null);}} notify={notify}/>}
          {view==="list"    && <ListView    filtered={filtered} items={items} updateItem={updateItem} addItem={addItem} setModal={setModal} notify={notify} deleteItem={deleteItem}/>}
          {view==="gantt"   && <GanttView   filtered={filtered} setModal={setModal}/>}
          {view==="metrics" && <MetricsView items={items}/>}
          {view==="team"    && <TeamView    teamMembers={teamMembers} refreshTeamMembers={refreshTeamMembers} roles={roles} refreshRoles={refreshRoles} notify={notify}/>}
        </div>
      </div>

      {activeItem && <ItemModal item={activeItem} items={items} onClose={()=>setModal(null)} onUpdate={p=>updateItem(activeItem.id,p)} onDelete={()=>deleteItem(activeItem.id)} notify={notify} customFieldDefinitions={customFieldDefinitions.filter(d=>d.entity_type==='work_item'&&(!d.project_id||d.project_id===selectedProjectId))} selectedProjectId={selectedProjectId}/>}
      {showCreateSprintModal && <CreateSprintModal projects={projects} defaultProjectId={selectedProjectId} onClose={()=>setShowCreateSprintModal(false)} onCreated={()=>{ refreshSprints(); setShowCreateSprintModal(false); notify("Sprint created"); }} notify={notify} customFieldDefinitions={customFieldDefinitions.filter(d=>d.entity_type==='sprint')} API_BASE={API_BASE}/>}
      {showCreateProjectModal && <CreateProjectModal onClose={()=>setShowCreateProjectModal(false)} onCreated={()=>{ refreshProjects(); setShowCreateProjectModal(false); notify("Project created"); }} notify={notify} customFieldDefinitions={customFieldDefinitions.filter(d=>d.entity_type==='project')}/>}
      {showSettingsModal && <SettingsModal onClose={()=>setShowSettingsModal(false)} customFieldDefinitions={customFieldDefinitions} refreshCustomFieldDefinitions={refreshCustomFieldDefinitions} projects={projects} selectedProjectId={selectedProjectId} notify={notify} API_BASE={API_BASE}/>}
    </div>
    </UsersContext.Provider>
  );
}

// ─── BOARD ────────────────────────────────────────────────────────────────────
const BOARD_COL_DRAG = "board-col";
function BoardView({filtered,items,boardColumns,selectedProject,updateProject,updateItem,addItem,setModal,dragId,dragOver,onDragStart,onDragOver,onDrop,notify}) {
  const cols = boardColumns && boardColumns.length ? boardColumns : COLS;
  const [colDragId, setColDragId] = useState(null);

  const handleColumnReorder = useCallback((fromId, toId) => {
    if (!selectedProject?.id || fromId === toId) return;
    const order = selectedProject.board_column_order && Array.isArray(selectedProject.board_column_order) ? [...selectedProject.board_column_order] : DEFAULT_COLUMN_ORDER;
    const fromIdx = order.indexOf(fromId);
    const toIdx = order.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...order];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, fromId);
    updateProject(selectedProject.id, { board_column_order: next }).then(ok => { if (ok) notify("Column order saved"); });
  }, [selectedProject, updateProject, notify]);

  return (
    <div className="flex gap-4 p-5 min-w-max items-start min-h-full bg-[#EDE8D0]">
      {cols.map(col=>(
        <Column key={col.id} col={col} items={filtered.filter(i=>i.status===col.id)} dragId={dragId} dragOver={dragOver} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onCardClick={setModal} addItem={addItem}
          canReorder={!!selectedProject} colDragId={colDragId} onColDragStart={()=>setColDragId(col.id)} onColDrop={()=>setColDragId(null)} onColumnReorder={handleColumnReorder}/>
      ))}
    </div>
  );
}

function Column({col,items,dragId,dragOver,onDragStart,onDragOver,onDrop,onCardClick,addItem,canReorder,colDragId,onColDragStart,onColDrop,onColumnReorder}) {
  const [adding,setAdding]=useState(false);
  const [title,setTitle]=useState("");
  const ref=useRef();
  const isOver=dragOver===col.id;
  const isColDragging = colDragId === col.id;
  const handleDrop = e => {
    e.preventDefault();
    if (e.dataTransfer.getData("text/plain") === BOARD_COL_DRAG && colDragId && onColumnReorder) {
      onColumnReorder(colDragId, col.id);
      onColDrop?.();
    } else if (dragId) {
      onDrop(col.id);
    }
  };
  const confirm=()=>{
    if(!title.trim()){setAdding(false);return;}
    addItem({id:"i"+mkId(),type:"task",title:title.trim(),status:col.id,priority:"medium",points:1,assignee:"u1",labels:[],startDate:"2026-03-04",endDate:"2026-03-10",description:"",criteria:[],comments:[],approvers:[],blockers:[]});
    setTitle("");setAdding(false);
  };
  return (
    <div className={`w-[272px] flex-shrink-0 flex flex-col rounded-xl bg-[#FAF8F2] border border-[rgba(0,0,0,0.06)] shadow-sm transition-all duration-200 ${isOver?"ring-2 ring-indigo-300 bg-indigo-50/50":""} ${isColDragging?"opacity-70":""}`}
      onDragOver={e=>{e.preventDefault();onDragOver(col.id);}}
      onDrop={handleDrop}>
      <div
        draggable={canReorder}
        onDragStart={canReorder ? e=>{ e.dataTransfer.setData("text/plain", BOARD_COL_DRAG); onColDragStart?.(); } : undefined}
        onDragEnd={canReorder ? onColDrop : undefined}
        onDragOver={e=>e.preventDefault()}
        className="flex items-center gap-2 px-3 pb-3 pt-2 cursor-grab active:cursor-grabbing"
      >
        {canReorder && <span className="text-[#78716c] text-xs">⋮⋮</span>}
        <div style={{background:col.color}} className="w-2.5 h-2.5 rounded-full"/>
        <span className="text-[13px] font-semibold text-[#57534e]">{col.label}</span>
        <span style={{color:col.color}} className="ml-auto text-xs font-bold tabular-nums">{items.length}</span>
      </div>
      <div className="flex flex-col gap-2 px-2 pb-2">
        {items.map(item=><Card key={item.id} item={item} isDragging={dragId===item.id} onDragStart={()=>onDragStart(item.id)} onClick={()=>onCardClick(item.id)}/>)}
        {adding ? (
          <div className="bg-[#F3F0E0] rounded-xl border border-[rgba(0,0,0,0.08)] p-3">
            <input ref={ref} value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")confirm();if(e.key==="Escape"){setAdding(false);setTitle("");}}} autoFocus placeholder="Item title… Enter to save" className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-lg px-2.5 py-2 text-sm text-[#1c1917] placeholder-[#78716c] outline-none focus:border-indigo-400"/>
            <div className="flex gap-2 mt-2.5">
              <PillBtn size="sm" onClick={confirm}>Save</PillBtn>
              <PillBtn size="sm" color="ghost" onClick={()=>{setAdding(false);setTitle("");}}>Cancel</PillBtn>
            </div>
          </div>
        ) : (
          <button onClick={()=>{setAdding(true);setTimeout(()=>ref.current?.focus(),40);}} className="w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-[rgba(0,0,0,0.12)] text-[13px] text-[#78716c] hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-150">
            + Add item
          </button>
        )}
      </div>
    </div>
  );
}

function Card({item,isDragging,onDragStart,onClick}) {
  const tc=TYPE[item.type]||TYPE.task, pc=PRIO[item.priority]||PRIO.medium;
  const totCrit = item.criteria_total ?? (item.criteria || []).length;
  const doneCrit = item.criteria_done ?? (item.criteria || []).filter(c=>c.done).length;
  const isBlocked=item.blockers?.length>0;
  const pct=totCrit>0?doneCrit/totCrit*100:0;
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className={`card-item group cursor-pointer bg-white rounded-xl border border-l-4 ${tc.border} border-[rgba(0,0,0,0.08)] p-3.5 shadow-sm select-none ${isDragging?"opacity-30 scale-95":""} ${isBlocked?"border-l-rose-500":""}`}>
      {isBlocked && <div className="flex items-center gap-1.5 mb-2.5 text-[10px] font-semibold text-rose-400"><span>◉</span>BLOCKED</div>}
      <div className="flex items-center gap-2 mb-2.5">
        <Chip className={tc.bg}>{tc.icon} {tc.label}</Chip>
        <div className="ml-auto flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${pc.dot}`}/><span className={`text-[10px] font-medium ${pc.bg.split(' ').find(c=>c.startsWith('text-'))}`}>{pc.label}</span></div>
      </div>
      <p className={`text-[13px] font-medium leading-snug mb-3 text-[#1c1917] group-hover:text-[#292524] transition-colors ${item.status==="done"?"line-through opacity-50":""}`}>{item.title}</p>
      {item.labels?.length>0 && (
        <div className="flex gap-1 flex-wrap mb-2.5">
          {item.labels.slice(0,3).map(lid=>{const l=labelById(lid);return l?<Chip key={lid} className={l.style}>{l.name}</Chip>:null;})}
        </div>
      )}
      {totCrit>0 && (
        <div className="mb-2.5">
          <div className="h-[3px] bg-[#E2DCC5] rounded-full overflow-hidden">
            <div style={{width:`${pct}%`,background:tc.color}} className="h-full rounded-full transition-all duration-500"/>
          </div>
          <p className="text-[10px] text-[#78716c] mt-1 tabular-nums">{doneCrit}/{totCrit} criteria</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#78716c] font-medium tabular-nums">{item.points}pt</span>
        {(item.comment_count > 0 || (item.comments?.length ?? 0) > 0) && <span className="text-[11px] text-[#78716c]">💬 {item.comment_count ?? item.comments?.length ?? 0}</span>}
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
  const th="px-4 py-2.5 text-left text-[10px] font-semibold text-[#57534e] tracking-[0.08em] uppercase bg-[#E2DCC5] border-b border-[rgba(0,0,0,0.08)]";
  const td="px-4 py-3 text-[13px] align-middle border-b border-[rgba(0,0,0,0.06)]";
  const InlineSel=({val,onChange,opts})=><Select value={val} onChange={e=>onChange(e.target.value)} className="text-xs py-1 px-2 w-full">{opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select>;
  return (
    <div className="p-5">
      <div className="bg-[#FAF8F2] rounded-xl border border-[rgba(0,0,0,0.08)] overflow-hidden shadow-md">
        <table className="w-full border-collapse">
          <thead><tr>{["Type","Title","Status","Priority","Pts","Assignee",""].map(h=><th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((item,idx)=>{
              const isEdit=editId===item.id, tc=TYPE[item.type]||TYPE.task, pc=PRIO[item.priority]||PRIO.medium, col=colById(item.status);
              return (
                <tr key={item.id} className={`group transition-colors ${isEdit?"bg-indigo-50":idx%2===0?"bg-transparent":"bg-[#F3F0E0]/60"} hover:bg-[#EDE8D0]/80`}>
                  <td className={td}>{isEdit?<InlineSel val={buf.type} onChange={v=>setBuf(b=>({...b,type:v}))} opts={[["epic","⚡ Epic"],["story","◆ Story"],["bug","● Bug"],["task","✓ Task"]]}/>:<Chip className={tc.bg}>{tc.icon} {tc.label}</Chip>}</td>
                  <td className={`${td} max-w-[240px]`}>{isEdit?<Input value={buf.title} onChange={e=>setBuf(b=>({...b,title:e.target.value}))} className="w-full text-xs py-1"/>:<button onClick={()=>setModal(item.id)} className={`text-left font-medium hover:text-indigo-600 transition-colors text-[13px] ${item.status==="done"?"line-through opacity-50":"text-[#1c1917]"}`}>{item.title}</button>}</td>
                  <td className={td}>{isEdit?<InlineSel val={buf.status} onChange={v=>setBuf(b=>({...b,status:v}))} opts={COLS.map(c=>[c.id,c.label])}/>:col&&<span style={{color:col.color}} className="text-[11px] font-semibold">{col.label}</span>}</td>
                  <td className={td}>{isEdit?<InlineSel val={buf.priority} onChange={v=>setBuf(b=>({...b,priority:v}))} opts={Object.entries(PRIO).map(([k,v])=>[k,v.label])}/>:<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${pc.dot}`}/><span className={`text-[11px] font-medium ${pc.bg.split(' ').find(c=>c.startsWith('text-'))}`}>{pc.label}</span></div>}</td>
                  <td className={`${td} text-center tabular-nums`}>{isEdit?<Input type="number" value={buf.points} onChange={e=>setBuf(b=>({...b,points:+e.target.value}))} className="w-14 text-center text-xs py-1"/>:<span className="text-[#57534e] font-medium">{item.points}</span>}</td>
                  <td className={td}>{isEdit?<InlineSel val={buf.assignee} onChange={v=>setBuf(b=>({...b,assignee:v}))} opts={[["","—"],...useUsers().map(u=>[u.id,u.name])]}/>:item.assignee?<Avatar userId={item.assignee} size={6}/>:<span className="text-[#78716c]">—</span>}</td>
                  <td className={`${td} w-24`}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isEdit?(<><PillBtn size="sm" color="jade" onClick={()=>saveEdit(item.id)}>Save</PillBtn><PillBtn size="sm" color="ghost" onClick={()=>setEditId(null)}>✕</PillBtn></>):(
                        <><button onClick={()=>startEdit(item)} className="p-1.5 rounded-lg text-[#57534e] hover:text-indigo-600 hover:bg-indigo-100 transition-all" title="Edit">✏</button><button onClick={()=>setModal(item.id)} className="p-1.5 rounded-lg text-[#57534e] hover:text-blue-600 hover:bg-blue-100 transition-all" title="Details">⊙</button><button onClick={()=>{if(window.confirm("Delete?"))deleteItem(item.id);}} className="p-1.5 rounded-lg text-[#57534e] hover:text-rose-600 hover:bg-rose-100 transition-all" title="Delete">✕</button></>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {addingRow&&(
              <tr className="bg-indigo-50 border-t border-indigo-200">
                <td className={td}><InlineSel val={nr.type} onChange={v=>setNr(r=>({...r,type:v}))} opts={[["epic","⚡ Epic"],["story","◆ Story"],["bug","● Bug"],["task","✓ Task"]]}/></td>
                <td className={td}><Input ref={addRef} value={nr.title} onChange={e=>setNr(r=>({...r,title:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")confirmNew();if(e.key==="Escape")setAddingRow(false);}} autoFocus placeholder="Item title…" className="w-full text-xs py-1"/></td>
                <td className={td}><InlineSel val={nr.status} onChange={v=>setNr(r=>({...r,status:v}))} opts={COLS.map(c=>[c.id,c.label])}/></td>
                <td className={td}><InlineSel val={nr.priority} onChange={v=>setNr(r=>({...r,priority:v}))} opts={Object.entries(PRIO).map(([k,v])=>[k,v.label])}/></td>
                <td className={td}><Input type="number" value={nr.points} onChange={e=>setNr(r=>({...r,points:+e.target.value}))} className="w-14 text-center text-xs py-1"/></td>
                <td className={td}><InlineSel val={nr.assignee} onChange={v=>setNr(r=>({...r,assignee:v}))} opts={[["","—"],...useUsers().map(u=>[u.id,u.name])]}/></td>
                <td className={td}><div className="flex gap-1.5"><PillBtn size="sm" onClick={confirmNew}>Add</PillBtn><PillBtn size="sm" color="ghost" onClick={()=>setAddingRow(false)}>✕</PillBtn></div></td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-2.5">
          <button onClick={()=>{setAddingRow(true);setTimeout(()=>addRef.current?.focus(),50);}} className="flex items-center gap-2 text-[12px] text-[#57534e] hover:text-indigo-600 px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-all">
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
      <div className="bg-[#FAF8F2] rounded-xl border border-[rgba(0,0,0,0.08)] overflow-hidden shadow-md">
        <div className="px-5 py-3.5 border-b border-[rgba(0,0,0,0.08)] flex items-center gap-4">
          <span className="text-sm font-semibold text-[#1c1917]">Sprint Timeline</span>
          <span className="text-[11px] text-[#57534e]">Mar 1–14, 2026</span>
          <div className="flex items-center gap-4 ml-auto">
            {COLS.filter(c=>c.id!=="backlog").map(c=>(
              <div key={c.id} className="flex items-center gap-1.5 text-[11px] text-[#57534e]">
                <div style={{background:c.color}} className="w-2 h-2 rounded-sm opacity-80"/>{c.label}
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="flex" style={{minWidth:LW+DAYS*DW}}>
            {/* Labels */}
            <div style={{width:LW}} className="flex-shrink-0 border-r border-[rgba(255,255,255,0.06)]">
              <div style={{height:36}} className="flex items-center px-4 border-b border-[rgba(0,0,0,0.08)] bg-[#E2DCC5]">
                <span className="text-[10px] font-semibold text-[#57534e] uppercase tracking-widest">Item</span>
              </div>
              {filtered.map(item=>{
                const tc=TYPE[item.type]||TYPE.task;
                return (
                  <div key={item.id} onClick={()=>setModal(item.id)} style={{height:RH}} className="flex items-center gap-2.5 px-4 border-b border-[rgba(255,255,255,0.04)] cursor-pointer hover:bg-white/[0.02] transition-colors group">
                    <Chip className={`${tc.bg} flex-shrink-0`}>{tc.icon}</Chip>
                    <span className="text-[12px] font-medium text-[#57534e] group-hover:text-[#1c1917] transition-colors truncate flex-1">{item.title}</span>
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
                  <div key={i} style={{width:DW}} className={`flex-shrink-0 flex items-center justify-center border-b border-r border-[rgba(0,0,0,0.06)] text-[10px] ${i===todayOff?"text-indigo-600 font-bold bg-indigo-100":d.getDay()===0||d.getDay()===6?"text-[#78716c]":"text-[#57534e] font-medium"}`}>
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
                    {days.map((_,i)=><div key={i} style={{width:DW}} className={`flex-shrink-0 border-r border-[rgba(0,0,0,0.06)] h-full ${i===todayOff?"bg-indigo-50":""}`}/>)}
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
  const users = useUsers();
  const byUser = users.map(u=>({u,count:items.filter(i=>i.assignee===u.id).length,done:items.filter(i=>i.assignee===u.id&&i.status==="done").length,pts:items.filter(i=>i.assignee===u.id).reduce((s,i)=>s+i.points,0)}));
  const totalPts=items.reduce((s,i)=>s+i.points,0), donePts=items.filter(i=>i.status==="done").reduce((s,i)=>s+i.points,0), vel=totalPts?Math.round(donePts/totalPts*100):0;
  const byType=["epic","story","bug","task"].map(t=>({t,count:items.filter(i=>i.type===t).length}));
  const byPrio=Object.entries(PRIO).map(([p,cfg])=>({p,cfg,count:items.filter(i=>i.priority===p).length}));
  const burn=Array.from({length:14},(_,i)=>({d:i,ideal:Math.round(totalPts*(1-i/13)),actual:i<=3?Math.round(totalPts*(1-(i/13)*(vel/100))+(Math.random()-.5)*1.2):null}));
  const W=560,H=150,pl=36,pr=16,pt=8,pb=24;
  const xs=i=>pl+i*(W-pl-pr)/13, ys=v=>H-pb-(v/(totalPts||1))*(H-pt-pb);

  const KCard=({label,value,sub,col="#7c6af7"})=>(
    <div className="bg-[#FAF8F2] rounded-xl border border-[rgba(0,0,0,0.08)] p-5 shadow-md">
      <p className="text-[10px] font-semibold text-[#57534e] uppercase tracking-[0.08em] mb-2">{label}</p>
      <p style={{color:col}} className="text-3xl font-bold tabular-nums">{value}</p>
      {sub&&<p className="text-[11px] text-[#57534e] mt-1.5">{sub}</p>}
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
        <div className="bg-[#FAF8F2] rounded-xl border border-[rgba(0,0,0,0.08)] p-5 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-semibold text-[#1c1917]">Sprint Burndown</span>
            <div className="flex gap-4 ml-auto text-[10px] text-[#57534e]">
              <span className="flex items-center gap-1.5"><span style={{width:16,height:1,borderTop:"1.5px dashed #78716c",display:"inline-block"}}/> Ideal</span>
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
                <text x={pl-4} y={ys(totalPts*p/100)+4} textAnchor="end" fontSize="9" fill="#57534e">{Math.round(totalPts*(1-p/100))}</text>
              </g>
            ))}
            <polyline points={burn.map((d,i)=>`${xs(i)},${ys(d.ideal)}`).join(" ")} fill="none" stroke="#78716c" strokeWidth="1" strokeDasharray="4,3"/>
            {burn.filter(d=>d.actual!=null).length>1&&(
              <polygon points={[...burn.filter(d=>d.actual!=null).map((d,i)=>`${xs(i)},${ys(d.actual)}`),`${xs(burn.filter(d=>d.actual!=null).length-1)},${H-pb}`,`${xs(0)},${H-pb}`].join(" ")} fill="url(#burnGrad)"/>
            )}
            <polyline points={burn.filter(d=>d.actual!=null).map((d,i)=>`${xs(i)},${ys(d.actual)}`).join(" ")} fill="none" stroke="#7c6af7" strokeWidth="2"/>
            {burn.filter(d=>d.actual!=null).map((d,i)=><circle key={i} cx={xs(i)} cy={ys(d.actual)} r="3" fill="#6366f1" stroke="#FAF8F2" strokeWidth="1.5"/>)}
            {burn.filter((_,i)=>i%2===0).map((d,i)=><text key={i} x={xs(i*2)} y={H-6} textAnchor="middle" fontSize="8.5" fill="#57534e">Mar {d.d+1}</text>)}
          </svg>
        </div>

        {/* Team workload */}
        <div className="bg-[#FAF8F2] rounded-xl border border-[rgba(0,0,0,0.08)] p-5 shadow-md">
          <p className="text-sm font-semibold text-[#1c1917] mb-4">Team Workload</p>
          <div className="space-y-4">
            {byUser.map(({u,count,done,pts})=>(
              <div key={u.id} className="flex items-center gap-3">
                <Avatar userId={u.id} size={7}/>
                <div className="flex-1">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] font-semibold text-[#1c1917]">{u.name}</span>
                    <span className="text-[10px] text-[#57534e] tabular-nums">{done}/{count} · {pts}pts</span>
                  </div>
                  <div className="h-1.5 bg-[#E2DCC5] rounded-full overflow-hidden">
                    <div style={{width:`${count?done/count*100:0}%`,background:u.hex}} className="h-full rounded-full transition-all duration-700"/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status bars */}
        <div className="bg-[#FAF8F2] rounded-xl border border-[rgba(0,0,0,0.08)] p-5 shadow-md">
          <p className="text-sm font-semibold text-[#1c1917] mb-4">Status Breakdown</p>
          <div className="space-y-3.5">
            {byStatus.map(s=>(
              <div key={s.id}>
                <div className="flex justify-between mb-1.5">
                  <span style={{color:s.color}} className="text-[12px] font-semibold">{s.label}</span>
                  <span className="text-[10px] text-[#57534e] tabular-nums">{s.count} items · {s.pts}pts</span>
                </div>
                <div className="h-2 bg-[#E2DCC5] rounded-full overflow-hidden">
                  <div style={{width:`${total?s.count/total*100:0}%`,background:s.color+"90"}} className="h-full rounded-full transition-all duration-700"/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Type + Priority */}
        <div className="bg-[#FAF8F2] rounded-xl border border-[rgba(0,0,0,0.08)] p-5 shadow-md">
          <p className="text-sm font-semibold text-[#1c1917] mb-4">Distribution</p>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-[10px] font-semibold text-[#57534e] uppercase tracking-widest mb-3">By Type</p>
              {byType.map(({t,count})=>{
                const tc=TYPE[t]||TYPE.task;
                return (
                  <div key={t} className="flex items-center gap-2 mb-2">
                    <Chip className={tc.bg}>{tc.icon}</Chip>
                    <span className="text-[12px] text-[#57534e] capitalize flex-1">{t}</span>
                    <span className="text-[12px] font-semibold text-[#1c1917] tabular-nums">{count}</span>
                    <div className="w-16 h-1.5 bg-[#E2DCC5] rounded-full overflow-hidden">
                      <div style={{width:`${total?count/total*100:0}%`,background:tc.color}} className="h-full rounded-full"/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#57534e] uppercase tracking-widest mb-3">By Priority</p>
              <div className="flex items-end gap-2.5 h-20">
                {byPrio.map(({p,cfg,count})=>{
                  const maxC=Math.max(...byPrio.map(b=>b.count),1);
                  return (
                    <div key={p} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-bold" style={{color:cfg.color}}>{count}</span>
                      <div style={{height:`${Math.max(count?count/maxC*60:0,3)}px`,background:cfg.color+"30",borderTop:`2px solid ${cfg.color}60`}} className="w-full rounded-t-md transition-all duration-700"/>
                      <span className="text-[8px] text-[#57534e] font-semibold uppercase">{p.slice(0,3)}</span>
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
function ItemModal({item,items,onClose,onUpdate,onDelete,notify,customFieldDefinitions=[],selectedProjectId}) {
  const [tab,setTab]=useState("overview");
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState({title:item.title,description:item.description||"",status:item.status,priority:item.priority,points:item.points,assignee:item.assignee||"",custom_field_values:item.custom_field_values||{}});
  const [newComment,setNewComment]=useState("");
  const [newCrit,setNewCrit]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const [aiResult,setAiResult]=useState(null);
  const tc=TYPE[item.type]||TYPE.task, pc=PRIO[item.priority]||PRIO.medium, col=colById(item.status);
  const workItemDefs = customFieldDefinitions.filter(d=>d.entity_type==='work_item');
  const set=(k,v)=>setDraft(d=>({...d,[k]:v}));
  const setCustom=(fieldId,value)=>setDraft(d=>({...d,custom_field_values:{...(d.custom_field_values||{}),[fieldId]:value}}));
  const saveEdit=()=>{
    const payload = { ...draft };
    if (payload.assignee !== undefined) { payload.assignee_id = payload.assignee; delete payload.assignee; }
    onUpdate(payload);
    setEditing(false);
    notify("Saved");
  };
  const toggleCrit=cid=>{onUpdate({criteria:item.criteria.map(c=>c.id===cid?{...c,done:!c.done}:c)});notify("Updated");};
  const addCrit=()=>{if(!newCrit.trim())return;onUpdate({criteria:[...item.criteria,{id:"c"+mkId(),text:newCrit.trim(),done:false}]});setNewCrit("");notify("Added");};
  const delCrit=cid=>onUpdate({criteria:item.criteria.filter(c=>c.id!==cid)});
  const postComment=()=>{if(!newComment.trim())return;onUpdate({comments:[...(item.comments||[]),{id:"cm"+mkId(),user:"u1",text:newComment.trim(),ts:new Date().toISOString()}]});setNewComment("");notify("Posted");};
  const approve=(aid,status)=>{onUpdate({approvers:item.approvers.map(a=>a.id===aid?{...a,status}:a)});notify(status==="approved"?"Approved ✓":"Rejected");};
  const addApprover=uid=>{if(item.approvers.find(a=>(a.user||a.member_id)===uid)){notify("Already added","error");return;}onUpdate({approvers:[...item.approvers,{id:"a"+mkId(),user:uid,member_id:uid,status:"pending"}]});notify("Approver added");};
  const removeApprover=aid=>{onUpdate({approvers:item.approvers.filter(a=>a.id!==aid)});notify("Removed");};
  const clearBlockers=()=>{onUpdate({blockers:[]});notify("Blockers cleared");};
  const runAI=async action=>{
    setAiLoading(true);setAiResult(null);await new Promise(r=>setTimeout(r,1000));
    const res={generate_criteria:{type:"list",label:"Suggested Acceptance Criteria",items:["Works for all user roles and permissions","API response time < 2s under normal load","Unit test coverage ≥ 85%","Error states handled with clear user messaging","WCAG 2.1 AA accessibility compliant","Responsive across mobile breakpoints","Rollback plan documented and tested"]},estimate_points:{type:"text",label:"AI Estimate",content:"Recommended: 5 story points\n\nBased on 3 similar LWC+Apex stories averaging 4.7pts this sprint. Standard integration pattern, but DOM observer adds complexity (+1pt). Consider splitting if scope expands."},identify_blockers:{type:"list",label:"Identified Risks",items:["Aman at 96% sprint capacity — consider reassignment","embeddedservice_bootstrap timing dependency not fully handled","No rollback plan for Omni-Channel config changes","Firefox CSS regression flagged in comments — unresolved"]}};
    setAiResult(res[action]);setAiLoading(false);
  };
  const TABS=[{id:"overview",l:"Overview"},{id:"criteria",l:`Criteria (${item.criteria?.length||0})`},{id:"approvers",l:`Approvers (${item.approvers?.length||0})`},{id:"comments",l:`Comments (${item.comments?.length||0})`},{id:"blockers",l:`Blockers (${item.blockers?.length||0})`},{id:"ai",l:"✦ AI"}];
  const Row=({label,val})=>(
    <div><p className="text-[10px] font-semibold text-[#57534e] uppercase tracking-[0.08em] mb-1.5">{label}</p>{val}</div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/25 backdrop-blur-sm anim-fade-in" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-[#FAF8F2] rounded-2xl border border-[rgba(0,0,0,0.08)] shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col anim-scale-in">

        {/* Modal header */}
        <div className="px-6 pt-5 pb-0 border-b border-[rgba(255,255,255,0.07)] flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Chip className={tc.bg}>{tc.icon} {tc.label}</Chip>
            <Chip className={pc.bg}>{pc.label}</Chip>
            {col&&<Chip style={{color:col.color,borderColor:col.color+"40",background:col.color+"12"}}>{col.label}</Chip>}
            <code className="ml-auto text-[10px] text-[#78716c] font-mono">#{item.id}</code>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#57534e] hover:text-[#1c1917] hover:bg-[#E2DCC5] transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          {editing
            ?<input value={draft.title} onChange={e=>set("title",e.target.value)} className="text-lg font-semibold w-full bg-transparent border-b border-indigo-500 outline-none pb-2 mb-3 text-[#1c1917]"/>
            :<h2 onClick={()=>setEditing(true)} className="text-[17px] font-semibold text-[#1c1917] mb-3 cursor-text hover:text-[#292524] transition-colors">{item.title}</h2>
          }
          <div className="flex gap-0">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2.5 text-[12px] font-medium border-b-2 transition-all whitespace-nowrap ${tab===t.id?"border-indigo-500 text-indigo-700":"border-transparent text-[#57534e] hover:text-[#1c1917]"}`}>{t.l}</button>
            ))}
          </div>
          {editing && (
            <div className="mt-3 flex items-center gap-2 py-2 px-3 rounded-lg bg-indigo-50 border border-indigo-200">
              <span className="text-[12px] font-medium text-indigo-800 flex-1">Editing — save your changes</span>
              <button onClick={saveEdit} className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition-colors">Save</button>
              <button onClick={()=>setEditing(false)} className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-100 text-sm font-medium rounded-lg transition-colors">Cancel</button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-5">
          {tab==="overview"&&(
            <div className="flex gap-6">
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-[#57534e] uppercase tracking-[0.08em] mb-2">Description</p>
                {editing
                  ?<textarea value={draft.description} onChange={e=>set("description",e.target.value)} rows={5} className="w-full bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-xl px-3.5 py-3 text-sm text-[#1c1917] focus:border-indigo-400 outline-none resize-none leading-relaxed"/>
                  :<p className="text-[13px] text-[#9ca3af] leading-relaxed">{item.description||<em className="text-[#6b7280]">No description yet.</em>}</p>
                }
              </div>
              <div className="w-44 flex-shrink-0 space-y-4">
                <Row label="Status"   val={editing?<Select value={draft.status} onChange={e=>set("status",e.target.value)} className="w-full text-xs py-1.5">{COLS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</Select>:col&&<span style={{color:col.color}} className="text-[12px] font-semibold">{col.label}</span>}/>
                <Row label="Priority" val={editing?<Select value={draft.priority} onChange={e=>set("priority",e.target.value)} className="w-full text-xs py-1.5">{Object.entries(PRIO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</Select>:<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${pc.dot}`}/><span style={{color:pc.color}} className="text-[12px] font-semibold">{pc.label}</span></div>}/>
                <Row label="Points"   val={editing?<Input type="number" value={draft.points} onChange={e=>set("points",+e.target.value)} className="w-full text-xs py-1.5"/>:<span className="text-[12px] font-semibold text-[#d1d5db]">{item.points} pts</span>}/>
                <Row label="Assignee" val={editing?<Select value={draft.assignee} onChange={e=>set("assignee",e.target.value)} className="w-full text-xs py-1.5"><option value="">Unassigned</option>{useUsers().map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</Select>:item.assignee?<div className="flex items-center gap-2"><Avatar userId={item.assignee} size={6}/><span className="text-[12px] text-[#d1d5db]">{userByIdFromList(useUsers(), item.assignee)?.name}</span></div>:<span className="text-[#6b7280] text-[12px]">Unassigned</span>}/>
                <Row label="Labels" val={<div className="flex gap-1 flex-wrap">{(item.labels||[]).map(lid=>{const l=labelById(lid);return l?<Chip key={lid} className={l.style}>{l.name}</Chip>:null;})}</div>}/>
                {workItemDefs.length > 0 && (
                  <div className="pt-3 border-t border-[rgba(0,0,0,0.06)]">
                    <p className="text-[10px] font-semibold text-[#57534e] uppercase tracking-[0.08em] mb-2">Custom fields</p>
                    <div className="space-y-2">
                      {workItemDefs.map(def=>(
                        <div key={def.id}>
                          {def.field_type==="text"&&<input value={draft.custom_field_values?.[def.id]??""} onChange={e=>setCustom(def.id,e.target.value)} placeholder={def.name} className="w-full bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-lg px-2.5 py-1.5 text-xs"/>}
                          {def.field_type==="number"&&<input type="number" value={draft.custom_field_values?.[def.id]??""} onChange={e=>setCustom(def.id,e.target.value)} placeholder={def.name} className="w-full bg-[#F3F0E0] border rounded-lg px-2.5 py-1.5 text-xs"/>}
                          {def.field_type==="date"&&<input type="date" value={draft.custom_field_values?.[def.id]??""} onChange={e=>setCustom(def.id,e.target.value)} className="w-full bg-[#F3F0E0] border rounded-lg px-2.5 py-1.5 text-xs"/>}
                          {def.field_type==="checkbox"&&<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!draft.custom_field_values?.[def.id]} onChange={e=>setCustom(def.id,e.target.checked)}/>{def.name}</label>}
                          {def.field_type==="select"&&<select value={draft.custom_field_values?.[def.id]??""} onChange={e=>setCustom(def.id,e.target.value)} className="w-full bg-[#F3F0E0] border rounded-lg px-2.5 py-1.5 text-xs"><option value="">—</option>{(def.options||[]).map(o=><option key={o} value={o}>{o}</option>)}</select>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab==="criteria"&&(
            <div>
              {item.criteria?.length===0&&<p className="text-sm text-[#6b7280] mb-4">No criteria yet.</p>}
              <div className="space-y-2 mb-4">
                {item.criteria?.map(c=>(
                  <div key={c.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${c.done?"bg-emerald-50 border-emerald-200":"bg-[#F3F0E0] border-[rgba(0,0,0,0.08)]"}`}>
                    <button onClick={()=>toggleCrit(c.id)} className={`w-4.5 h-4.5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border transition-all flex-none ${c.done?"bg-emerald-500 border-emerald-500 text-white":"border-[rgba(0,0,0,0.15)] hover:border-emerald-400"}`} style={{width:18,height:18}}>
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
                <div className="mt-4 p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="flex justify-between mb-2 text-[12px]"><span className="font-semibold text-indigo-700">Progress</span><span className="text-indigo-600 font-bold tabular-nums">{item.criteria.filter(c=>c.done).length}/{item.criteria.length} · {Math.round(item.criteria.filter(c=>c.done).length/item.criteria.length*100)}%</span></div>
                  <div className="h-1.5 bg-[#E2DCC5] rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all" style={{width:`${item.criteria.filter(c=>c.done).length/item.criteria.length*100}%`}}/></div>
                </div>
              )}
            </div>
          )}

          {tab==="approvers"&&(
            <div>
              {item.approvers?.length===0&&<p className="text-sm text-[#57534e] mb-4">No approvers assigned.</p>}
              <div className="space-y-2.5 mb-5">
                {item.approvers?.map(a=>{const uid=a.user||a.member_id; const u=userByIdFromList(useUsers(), uid);return(
                  <div key={a.id} className="flex items-center gap-3 p-3.5 bg-[#F3F0E0] rounded-xl border border-[rgba(0,0,0,0.08)]">
                    <Avatar userId={uid} size={8}/>
                    <div className="flex-1"><p className="text-[13px] font-semibold text-[#1c1917]">{u?.name}</p></div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${a.status==="approved"?"bg-emerald-100 text-emerald-700 border-emerald-200":a.status==="rejected"?"bg-rose-100 text-rose-700 border-rose-200":"bg-[#E2DCC5] text-[#57534e] border-[rgba(0,0,0,0.08)]"}`}>{a.status.toUpperCase()}</span>
                    {a.status==="pending"&&<><PillBtn size="sm" color="jade" onClick={()=>approve(a.id,"approved")}>Approve</PillBtn><PillBtn size="sm" color="rose" onClick={()=>approve(a.id,"rejected")}>Reject</PillBtn></>}
                    <button onClick={()=>removeApprover(a.id)} className="text-[#57534e] hover:text-rose-600 text-lg leading-none transition-colors">×</button>
                  </div>
                );})}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#57534e] uppercase tracking-[0.08em] mb-2.5">Add Approver</p>
                <div className="flex flex-wrap gap-2">
                  {useUsers().filter(u=>!item.approvers.find(a=>(a.user||a.member_id)===u.id)).map(u=>(
                    <button key={u.id} onClick={()=>addApprover(u.id)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] hover:border-indigo-300 hover:bg-indigo-50 transition-all text-[12px] font-medium text-[#57534e] hover:text-indigo-700">
                      <Avatar userId={u.id} size={5}/>{u.name}
                    </button>
                  ))}
                  {useUsers().every(u=>item.approvers.find(a=>(a.user||a.member_id)===u.id))&&<p className="text-[12px] text-[#6b7280]">All team members added.</p>}
                </div>
              </div>
            </div>
          )}

          {tab==="comments"&&(
            <div>
              {item.comments?.length===0&&<p className="text-sm text-[#6b7280] mb-4">No comments yet.</p>}
              <div className="space-y-4 mb-5">
                {item.comments?.map(c=>{const authorId=c.user||c.author_id; const u=userByIdFromList(useUsers(), authorId);return(
                  <div key={c.id} className="flex gap-3">
                    <Avatar userId={authorId} size={7}/>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5"><span className="text-[13px] font-semibold text-[#1c1917]">{u?.name}</span><span className="text-[11px] text-[#57534e]">{fmtTs(c.created_at||c.ts)}</span></div>
                      <div className="bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-[13px] text-[#1c1917] leading-relaxed">{c.body||c.text}</div>
                    </div>
                  </div>
                );})}
              </div>
              <div className="flex gap-3">
                <Avatar userId="u1" size={7}/>
                <div className="flex-1">
                  <textarea value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();postComment();}}} rows={3} placeholder="Leave a comment… Enter to post" className="w-full bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-xl px-3.5 py-3 text-[13px] text-[#1c1917] focus:border-indigo-400 outline-none resize-none placeholder-[#78716c]"/>
                  <PillBtn className="mt-2" onClick={postComment}>Post</PillBtn>
                </div>
              </div>
            </div>
          )}

          {tab==="blockers"&&(
            <div>
              {item.blockers?.length===0
                ?<div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-[13px] font-medium"><span>✓</span>No blockers — this item can proceed!</div>
                :<div className="space-y-2.5">
                  {item.blockers?.map(bid=>{const bl=items.find(i=>i.id===bid);if(!bl)return null;const btc=TYPE[bl.type]||TYPE.task;return(
                    <div key={bid} className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                      <span className="text-rose-600 text-lg">◉</span>
                      <div className="flex-1"><p className="text-[13px] font-semibold text-[#1c1917]">{bl.title}</p><p className="text-[11px] text-[#57534e] mt-0.5">{colById(bl.status)?.label} · {bl.assignee?userByIdFromList(useUsers(), bl.assignee)?.name:"Unassigned"}</p></div>
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
              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] overflow-hidden mb-5 bg-[#E2DCC5]">
                <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
                  <div className="flex items-center gap-2 mb-1"><span className="text-indigo-600">✦</span><span className="text-sm font-semibold text-[#1c1917]">AI Assistant</span></div>
                  <p className="text-[11px] text-[#57534e]">Generate intelligent insights for this work item.</p>
                </div>
                <div className="p-5 flex gap-2.5 flex-wrap">
                  {[["generate_criteria","📋 Criteria"],["estimate_points","◆ Estimate"],["identify_blockers","⚠ Risks"]].map(([a,l])=>(
                    <button key={a} onClick={()=>runAI(a)} disabled={aiLoading} className="px-4 py-2 bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[12px] font-semibold hover:bg-indigo-200 transition-colors disabled:opacity-40">{l}</button>
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
                <div className="bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-xl p-5 anim-fade-up">
                  <p className="text-[11px] font-bold text-[#7c6af7] uppercase tracking-[0.08em] mb-3">{aiResult.label}</p>
                  {aiResult.type==="list"?<ul className="space-y-2">{aiResult.items.map((t,i)=><li key={i} className="flex items-start gap-2.5 text-[13px] text-[#d1d5db]"><span className="text-[#7c6af7] mt-1 flex-shrink-0 text-[8px]">◆</span>{t}</li>)}</ul>:<pre className="text-[13px] text-[#d1d5db] whitespace-pre-wrap font-sans leading-relaxed">{aiResult.content}</pre>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[rgba(0,0,0,0.08)] bg-[#E2DCC5] rounded-b-2xl flex items-center gap-2 flex-shrink-0">
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
function TeamView({ teamMembers, refreshTeamMembers, roles, refreshRoles, notify }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:"", role:"", email:"", color:"#6366f1" });
  const [newRoleName, setNewRoleName] = useState("");

  const COLORS = ["#6366f1","#8b5cf6","#059669","#f59e0b","#ef4444","#0ea5e9","#ec4899","#14b8a6"];
  const initials = name => (name||"").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

  const openAdd = () => { setForm({name:"",role:"",email:"",color:COLORS[teamMembers.length % COLORS.length]}); setEditId(null); setShowAdd(true); };
  const openEdit = m  => { setForm({name:m.name,role:m.role||"",email:m.email,color:m.color}); setEditId(m.id); setShowAdd(true); };

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) { notify("Name and email required","error"); return; }
    const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role || null, color: form.color, avatar: initials(form.name) };
    try {
      if (editId) {
        const res = await fetch(`${API_BASE}/api/team-members/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) { const d = await res.json().catch(()=>({})); notify(d.error || "Update failed", "error"); return; }
        notify("Member updated");
      } else {
        const res = await fetch(`${API_BASE}/api/team-members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) { const d = await res.json().catch(()=>({})); notify(d.error || "Add failed", "error"); return; }
        notify("Member added");
      }
      setShowAdd(false);
      refreshTeamMembers();
    } catch (e) { notify(e.message || "Request failed", "error"); }
  };

  const toggle = async (id) => {
    const m = teamMembers.find(x=>x.id===id); if (!m) return;
    try {
      const res = await fetch(`${API_BASE}/api/team-members/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !m.active }) });
      if (!res.ok) return;
      notify("Updated");
      refreshTeamMembers();
    } catch (_) {}
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this team member?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/team-members/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      notify("Removed");
      refreshTeamMembers();
    } catch (_) {}
  };

  const addRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/roles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newRoleName.trim() }) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        let msg = d.error || "Add role failed";
        if (/self-signed|certificate/i.test(msg)) msg = "Self-signed certificate: run frontend with npm run dev or use API at http://localhost:4000.";
        notify(msg, "error");
        return;
      }
      setNewRoleName("");
      notify("Role added");
      refreshRoles();
    } catch (e) {
      const msg = e.message || "Request failed";
      notify(/self-signed|certificate/i.test(msg) ? "Self-signed certificate: run frontend with npm run dev so the proxy is used." : msg, "error");
    }
  };

  const deleteRole = async (id) => {
    try {
      await fetch(`${API_BASE}/api/roles/${id}`, { method: "DELETE" });
      notify("Role removed");
      refreshRoles();
    } catch (_) {}
  };

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-[#1c1917]">Team Members</h2>
          <p className="text-[12px] text-[#57534e] mt-0.5">{teamMembers.filter(m=>m.active).length} active · {teamMembers.length} total</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={()=>setShowRoles(!showRoles)} className="px-4 py-2 bg-[#E2DCC5] hover:bg-[#D4CEB8] text-[#1c1917] rounded-lg text-sm font-medium transition-colors">
            Manage roles
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold transition-colors">
            + Add Member
          </button>
        </div>
      </div>

      {/* Manage roles panel */}
      {showRoles && (
        <div className="mb-5 p-4 rounded-xl bg-[#FAF8F2] border border-[rgba(0,0,0,0.08)]">
          <p className="text-xs font-semibold text-[#57534e] uppercase tracking-wider mb-2">Roles (for team members)</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {roles.map(r=>(
              <span key={r.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] text-sm text-[#1c1917]">
                {r.name}
                <button type="button" onClick={()=>deleteRole(r.id)} className="text-[#78716c] hover:text-rose-600 text-sm leading-none" title="Remove role">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newRoleName} onChange={e=>setNewRoleName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addRole()} placeholder="New role name" className="flex-1 max-w-xs bg-white border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm text-[#1c1917] placeholder-[#78716c] focus:border-indigo-400 outline-none"/>
            <button type="button" onClick={addRole} className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium">Add role</button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3">
        {teamMembers.map(m => (
          <div key={m.id} className={`bg-[#FAF8F2] rounded-xl border border-[rgba(0,0,0,0.08)] p-4 transition-all ${m.active?"":"opacity-60"}`}>
            <div className="flex items-start gap-3 mb-3">
              <div style={{background:m.color||"#6366f1",width:44,height:44,fontSize:15}} className="rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 ring-1 ring-white/10">
                {m.avatar || initials(m.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#1c1917] truncate">{m.name}</p>
                <p className="text-[11px] text-[#57534e] truncate">{m.role || "—"}</p>
              </div>
            </div>
            <p className="text-[11px] text-[#57534e] mb-3 truncate">{m.email}</p>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.active?"bg-emerald-100 text-emerald-700 border-emerald-200":"bg-[#E2DCC5] text-[#57534e] border-[rgba(0,0,0,0.08)]"}`}>
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
        <button onClick={openAdd} className="bg-[#FAF8F2] rounded-xl border border-dashed border-[rgba(0,0,0,0.12)] p-4 flex flex-col items-center justify-center gap-2 text-[#57534e] hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all min-h-[140px]">
          <span className="text-3xl font-light">+</span>
          <span className="text-[12px] font-medium">Add team member</span>
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/25 backdrop-blur-sm" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="bg-[#FAF8F2] rounded-2xl border border-[rgba(0,0,0,0.08)] shadow-xl w-full max-w-md p-6" style={{animation:"scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)"}}>
            <div className="flex items-center gap-3 mb-5">
              <div style={{background:form.color,width:40,height:40,fontSize:14}} className="rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                {form.name ? initials(form.name) : "?"}
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[#1c1917]">{editId ? "Edit Member" : "Add Team Member"}</h3>
                <p className="text-[11px] text-[#57534e]">Fill in the details below</p>
              </div>
              <button onClick={()=>setShowAdd(false)} className="ml-auto text-[#57534e] hover:text-[#1c1917] text-lg transition-colors">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Full Name *</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. John Smith" className="w-full bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm text-[#1c1917] placeholder-[#78716c] focus:border-indigo-400 outline-none transition-all"/>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Email *</label>
                <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} type="email" placeholder="john@company.com" className="w-full bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm text-[#1c1917] placeholder-[#78716c] focus:border-indigo-400 outline-none transition-all"/>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#57534e] uppercase tracking-wider mb-1.5">Role</label>
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} className="w-full bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm text-[#1c1917] focus:border-indigo-400 outline-none">
                  <option value="">Select role…</option>
                  {roles.map(r=><option key={r.id} value={r.name}>{r.name}</option>)}
                  {form.role && !roles.find(r=>r.name===form.role) && <option value={form.role}>{form.role}</option>}
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
              <button onClick={save} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold transition-colors">
                {editId ? "Save Changes" : "Add Member"}
              </button>
              <button onClick={()=>setShowAdd(false)} className="px-4 py-2 bg-[#E2DCC5] hover:bg-[#D4CEB8] border border-[rgba(0,0,0,0.08)] text-[#57534e] rounded-lg text-sm font-medium transition-colors">
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
function CreateSprintModal({ projects, defaultProjectId, onClose, onCreated, notify, customFieldDefinitions = [], API_BASE }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    project_id: defaultProjectId || "",
    name: "",
    goal: "",
    start_date: "",
    end_date: "",
    capacity: "",
    custom_field_values: {},
  });
  useEffect(() => { if (defaultProjectId) setForm(f => ({ ...f, project_id: defaultProjectId })); }, [defaultProjectId]);
  const sprintDefs = customFieldDefinitions.filter(d => d.entity_type === "sprint");
  const setCustom = (fieldId, value) => setForm(f => ({ ...f, custom_field_values: { ...(f.custom_field_values || {}), [fieldId]: value } }));

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
          custom_field_values: form.custom_field_values || {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Failed to create sprint (${res.status})`);
        return;
      }
      onCreated();
    } catch (err) {
      const msg = err.message || "Network error";
      const isFetchFailed = /failed to fetch|network error|load failed/i.test(msg);
      setError(isFetchFailed
        ? `Cannot reach the API at ${API_BASE}. Start the backend (see below) or set VITE_API_URL to your API URL.`
        : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/20 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] shadow-xl w-full max-w-md p-6" style={{ animation: "scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-lg font-bold">▤</div>
          <div>
            <h3 className="text-base font-semibold text-[#1c1917]">Create Sprint</h3>
            <p className="text-xs text-[#78716c]">Add a new time-boxed sprint to a project</p>
          </div>
          <button onClick={onClose} className="ml-auto text-[#78716c] hover:text-[#1c1917] text-xl leading-none">×</button>
        </div>

        {projects.length === 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
            Create a project first using the + button next to &quot;Projects&quot; in the sidebar.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-[#57534e] uppercase tracking-wider mb-1.5">Project *</label>
            <select value={form.project_id} onChange={e => set("project_id", e.target.value)} className="w-full bg-[#faf8f5] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm text-[#1c1917] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none" disabled={projects.length === 0}>
              <option value="">Select project…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#57534e] uppercase tracking-wider mb-1.5">Sprint name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Sprint 15" className="w-full bg-[#faf8f5] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm text-[#1c1917] placeholder-[#78716c] focus:border-indigo-400 outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#57534e] uppercase tracking-wider mb-1.5">Goal (optional)</label>
            <textarea value={form.goal} onChange={e => set("goal", e.target.value)} placeholder="What should this sprint achieve?" rows={2} className="w-full bg-[#faf8f5] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm text-[#1c1917] placeholder-[#78716c] focus:border-indigo-400 outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#57534e] uppercase tracking-wider mb-1.5">Start date</label>
              <input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="w-full bg-[#faf8f5] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm text-[#1c1917] focus:border-indigo-400 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#57534e] uppercase tracking-wider mb-1.5">End date</label>
              <input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className="w-full bg-[#faf8f5] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm text-[#1c1917] focus:border-indigo-400 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#57534e] uppercase tracking-wider mb-1.5">Capacity (story points)</label>
            <input type="number" min={0} value={form.capacity} onChange={e => set("capacity", e.target.value)} placeholder="0" className="w-full bg-[#faf8f5] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm text-[#1c1917] placeholder-[#78716c] focus:border-indigo-400 outline-none" />
          </div>
          {sprintDefs.length > 0 && (
            <div className="pt-2 border-t border-[rgba(0,0,0,0.06)]">
              <label className="block text-[10px] font-semibold text-[#57534e] uppercase tracking-wider mb-2">Custom fields</label>
              {sprintDefs.map(def => (
                <div key={def.id} className="mb-2">
                  {def.field_type === "text" && <input value={form.custom_field_values?.[def.id] ?? ""} onChange={e=>setCustom(def.id, e.target.value)} placeholder={def.name} className="w-full bg-[#F3F0E0] border rounded-lg px-3 py-2 text-sm" />}
                  {def.field_type === "number" && <input type="number" value={form.custom_field_values?.[def.id] ?? ""} onChange={e=>setCustom(def.id, e.target.value)} placeholder={def.name} className="w-full bg-[#F3F0E0] border rounded-lg px-3 py-2 text-sm" />}
                  {def.field_type === "date" && <input type="date" value={form.custom_field_values?.[def.id] ?? ""} onChange={e=>setCustom(def.id, e.target.value)} className="w-full bg-[#F3F0E0] border rounded-lg px-3 py-2 text-sm" />}
                  {def.field_type === "checkbox" && <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.custom_field_values?.[def.id]} onChange={e=>setCustom(def.id, e.target.checked)} /> <span className="text-sm">{def.name}</span></label>}
                  {def.field_type === "select" && <select value={form.custom_field_values?.[def.id] ?? ""} onChange={e=>setCustom(def.id, e.target.value)} className="w-full bg-[#F3F0E0] border rounded-lg px-3 py-2 text-sm"><option value="">—</option>{(def.options || []).map(o=> <option key={o} value={o}>{o}</option>)}</select>}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={submit} disabled={loading || projects.length === 0} className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold transition-colors">
            {loading ? "Creating…" : "Create Sprint"}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-[#e7e2db] hover:bg-[#d6d0c4] border border-[rgba(0,0,0,0.08)] text-[#57534e] rounded-lg text-sm font-medium transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS MODAL (Custom field definitions) ───────────────────────────────────
function SettingsModal({ onClose, customFieldDefinitions, refreshCustomFieldDefinitions, projects, selectedProjectId, notify, API_BASE }) {
  const [tab, setTab] = useState("project");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [newOptions, setNewOptions] = useState("");
  const [projectScope, setProjectScope] = useState(selectedProjectId || "");
  useEffect(() => { refreshCustomFieldDefinitions(); }, [refreshCustomFieldDefinitions]);

  const defsByType = (entityType, projectId) =>
    customFieldDefinitions.filter(d => d.entity_type === entityType && (entityType !== "work_item" || !d.project_id || d.project_id === projectId));

  const addDef = async () => {
    if (!newName.trim()) return;
    const entity_type = tab;
    const project_id = tab === "work_item" ? (projectScope || null) : null;
    try {
      const res = await fetch(`${API_BASE}/api/custom-field-definitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_type, project_id, name: newName.trim(), field_type: newType, options: newType === "select" && newOptions.trim() ? newOptions.split(",").map(s => s.trim()) : null }),
      });
      if (res.ok) { refreshCustomFieldDefinitions(); setNewName(""); setNewOptions(""); notify("Custom field added"); }
      else notify((await res.json()).error || "Failed", "error");
    } catch (e) { notify(e.message || "Failed", "error"); }
  };

  const deleteDef = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/custom-field-definitions/${id}`, { method: "DELETE" });
      if (res.ok) { refreshCustomFieldDefinitions(); notify("Removed"); }
    } catch (_) {}
  };

  const labels = { project: "Project", sprint: "Sprint", work_item: "Story / Task" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/20 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[rgba(0,0,0,0.08)]">
          <h3 className="text-lg font-semibold text-[#1c1917]">Custom fields & board</h3>
          <button onClick={onClose} className="text-[#78716c] hover:text-[#1c1917] text-xl">×</button>
        </div>
        <div className="flex border-b border-[rgba(0,0,0,0.06)]">
          {["project", "sprint", "work_item"].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium ${tab === t ? "text-indigo-600 border-b-2 border-indigo-500" : "text-[#57534e]"}`}>{labels[t]}</button>
          ))}
        </div>
        <div className="p-4 overflow-auto flex-1">
          {tab === "work_item" && (
            <div className="mb-3">
              <label className="block text-[10px] font-semibold text-[#57534e] uppercase mb-1">Scope to project (optional)</label>
              <select value={projectScope} onChange={e => setProjectScope(e.target.value)} className="w-full bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm">
                <option value="">All projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2 mb-3">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Field name" className="flex-1 bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm" />
            <select value={newType} onChange={e => setNewType(e.target.value)} className="bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm">
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="select">Select</option>
              <option value="checkbox">Checkbox</option>
            </select>
            {newType === "select" && <input value={newOptions} onChange={e => setNewOptions(e.target.value)} placeholder="Opt1, Opt2" className="w-32 bg-[#F3F0E0] border rounded-lg px-2 py-2 text-sm" />}
            <button onClick={addDef} className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium">Add</button>
          </div>
          <p className="text-[12px] text-[#78716c] mb-2">Defined fields for <strong>{labels[tab]}</strong>:</p>
          <ul className="space-y-1.5">
            {defsByType(tab, projectScope || null).map(d => (
              <li key={d.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#FAF8F2] border border-[rgba(0,0,0,0.06)]">
                <span className="text-sm font-medium text-[#1c1917]">{d.name}</span>
                <span className="text-[11px] text-[#78716c]">{d.field_type}</span>
                <button onClick={() => deleteDef(d.id)} className="text-rose-500 hover:text-rose-700 text-xs">Delete</button>
              </li>
            ))}
            {defsByType(tab, projectScope || null).length === 0 && <li className="text-[12px] text-[#78716c]">No custom fields yet. Add one above.</li>}
          </ul>
          <p className="text-[12px] text-[#78716c] mt-4">Board columns can be reordered by dragging the ⋮⋮ handle on each column header when a project is selected.</p>
        </div>
      </div>
    </div>
  );
}

// ─── CREATE PROJECT MODAL ─────────────────────────────────────────────────────
function CreateProjectModal({ onClose, onCreated, notify, customFieldDefinitions = [] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", color: "#6366f1", custom_field_values: {} });
  const PROJECT_COLORS = ["#6366f1","#8b5cf6","#059669","#f59e0b","#ef4444","#0ea5e9"];
  const projectDefs = customFieldDefinitions.filter(d => d.entity_type === "project");

  const setCustom = (fieldId, value) => setForm(f => ({ ...f, custom_field_values: { ...(f.custom_field_values || {}), [fieldId]: value } }));

  const submit = async () => {
    if (!form.name?.trim()) { notify("Project name is required", "error"); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), description: form.description?.trim() || null, color: form.color, custom_field_values: form.custom_field_values || {} }),
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      if (!res.ok) {
        let msg = data.error || data.message || (res.status >= 500 ? "Server error. Check backend logs." : text || `Error ${res.status}`);
        if (res.status === 404) msg = data.path ? `Route not found: ${data.path}. ${data.hint || "Set VITE_API_URL to your backend URL (no /api suffix)."}` : (msg || "API route not found.");
        if (/self-signed|certificate/i.test(msg)) msg += " Use the frontend dev server (npm run dev) so requests are proxied, or use an API URL with a valid HTTPS certificate.";
        setError(msg);
        return;
      }
      onCreated();
    } catch (e) {
      const msg = e.message || "Network error";
      const isFetchFailed = /failed to fetch|network error|load failed/i.test(msg);
      const isCert = /self-signed|certificate/i.test(msg);
      setError(isCert
        ? "Self-signed certificate: the API URL uses HTTPS with an untrusted cert. Run the frontend with npm run dev (requests go through the proxy) or use http://localhost:4000 for local API."
        : isFetchFailed
          ? `Cannot reach the API at ${API_BASE || "the proxy target"}. Start the backend or set VITE_API_URL in .env.`
          : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/20 backdrop-blur-sm" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-lg font-bold">◇</div>
          <div>
            <h3 className="text-base font-semibold text-[#1c1917]">New Project</h3>
            <p className="text-xs text-[#78716c]">Add a project to organize sprints and work</p>
          </div>
          <button onClick={onClose} className="ml-auto text-[#78716c] hover:text-[#1c1917] text-xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-[#57534e] uppercase tracking-wider mb-1.5">Project name *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. RevOps Initiative" className="w-full bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2.5 text-sm text-[#1c1917] placeholder-[#78716c] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#57534e] uppercase tracking-wider mb-1.5">Description (optional)</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Short description" rows={2} className="w-full bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm text-[#1c1917] placeholder-[#78716c] focus:border-indigo-400 outline-none resize-none" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#57534e] uppercase tracking-wider mb-1.5">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map(c=>(
                <button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{background:c,width:32,height:32,outline:form.color===c?"2px solid #1c1917":"none",outlineOffset:2}} className="rounded-lg transition-transform hover:scale-110" />
              ))}
            </div>
          </div>
          {projectDefs.length > 0 && (
            <div className="pt-2 border-t border-[rgba(0,0,0,0.06)]">
              <label className="block text-[10px] font-semibold text-[#57534e] uppercase tracking-wider mb-2">Custom fields</label>
              {projectDefs.map(def => (
                <div key={def.id} className="mb-2">
                  {def.field_type === "text" && <input value={form.custom_field_values?.[def.id] ?? ""} onChange={e=>setCustom(def.id, e.target.value)} placeholder={def.name} className="w-full bg-[#F3F0E0] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 text-sm" />}
                  {def.field_type === "number" && <input type="number" value={form.custom_field_values?.[def.id] ?? ""} onChange={e=>setCustom(def.id, e.target.value)} placeholder={def.name} className="w-full bg-[#F3F0E0] border rounded-lg px-3 py-2 text-sm" />}
                  {def.field_type === "date" && <input type="date" value={form.custom_field_values?.[def.id] ?? ""} onChange={e=>setCustom(def.id, e.target.value)} className="w-full bg-[#F3F0E0] border rounded-lg px-3 py-2 text-sm" />}
                  {def.field_type === "checkbox" && <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.custom_field_values?.[def.id]} onChange={e=>setCustom(def.id, e.target.checked)} /> <span className="text-sm">{def.name}</span></label>}
                  {def.field_type === "select" && <select value={form.custom_field_values?.[def.id] ?? ""} onChange={e=>setCustom(def.id, e.target.value)} className="w-full bg-[#F3F0E0] border rounded-lg px-3 py-2 text-sm"><option value="">—</option>{(def.options || []).map(o=> <option key={o} value={o}>{o}</option>)}</select>}
                  {!["text","number","date","checkbox","select"].includes(def.field_type) && <input value={form.custom_field_values?.[def.id] ?? ""} onChange={e=>setCustom(def.id, e.target.value)} placeholder={def.name} className="w-full bg-[#F3F0E0] border rounded-lg px-3 py-2 text-sm" />}
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button onClick={submit} disabled={loading} className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">{loading ? "Creating…" : "Create Project"}</button>
          <button onClick={onClose} className="px-4 py-2.5 bg-[#E2DCC5] hover:bg-[#D4CEB8] text-[#57534e] rounded-lg text-sm font-medium transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
