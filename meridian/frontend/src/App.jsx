import { useState, useEffect, useCallback, useRef } from 'react'
import { get, post, patch, del } from './api.js'

// ── CONSTANTS ─────────────────────────────────────────────
const COL_COLORS = {
  backlog:'#3d4a63', summit:'#3d9be9', ascent:'#f59e0b', basecamp:'#9b7dff', peak:'#00c9a7'
}
const CARD_ACCENTS = {
  summit:'linear-gradient(90deg,#3d9be9,#5a67e8)',
  ascent:'linear-gradient(90deg,#f59e0b,#ff5470)',
  basecamp:'linear-gradient(90deg,#9b7dff,#5a67e8)',
  peak:'linear-gradient(90deg,#00c9a7,#d4943a)'
}
const EMOJIS  = ['🎉','🚀','⛰️','🏔️','🏆','✨','💫','🎯','🌟','⚡']
const TOASTS  = ['Peak reached!','Summit conquered!','Another one done!','Quest complete, Captain!','Full ascent! ⚡']
const DEMO_TRANSCRIPTS = [
  'Follow up with Aman — rollup review is stalling. Consider breaking into sub-stories.',
  'Create task: Build LWC bridge that polls agent availability every 30 seconds.',
  'SOQL error root cause: rollup trigger is not bulk-safe. Needs static caching pattern.',
  'Update bogiefile configs with new AWS account IDs and proxy settings for QA.',
]

// ── SEED DATA (shown while DB loads / offline) ─────────────
const SEED_ITEMS = [
  { id:'s1', title:'Build agent availability detection system', type:'task',  priority:'high',   points:8,  status:'summit',  assignee_initials:'RK', assignee_color:'#6366f1' },
  { id:'s2', title:'Custom pre-chat LWC form + Omni-Channel routing', type:'story', priority:'high', points:13, status:'ascent', assignee_initials:'RK', assignee_color:'#6366f1' },
  { id:'s3', title:'SOQL query limit errors in revenue rollup', type:'bug',   priority:'medium', points:5,  status:'ascent',  assignee_initials:'SK', assignee_color:'#8b5cf6' },
  { id:'s4', title:'Opportunity rollup batch — 5+ level hierarchy', type:'story', priority:'medium', points:8, status:'basecamp', assignee_initials:'AM', assignee_color:'#059669' },
  { id:'s5', title:'SNS topic migration for auto-panda to QA', type:'task',  priority:'low',    points:3,  status:'peak',    assignee_initials:'PP', assignee_color:'#f59e0b' },
  { id:'s6', title:'AgentWork trigger refactor to handler pattern', type:'epic', priority:'high',  points:8,  status:'peak',    assignee_initials:'RK', assignee_color:'#6366f1' },
]
const SEED_COLS = [
  { id:'c1', slug:'backlog',  name:'Base Camp',    color:'#3d4a63', is_done:false },
  { id:'c2', slug:'summit',   name:'Summit Ready', color:'#3d9be9', is_done:false },
  { id:'c3', slug:'ascent',   name:'In Ascent',    color:'#f59e0b', is_done:false },
  { id:'c4', slug:'basecamp', name:'At Base Camp', color:'#9b7dff', is_done:false },
  { id:'c5', slug:'peak',     name:'Peak Reached', color:'#00c9a7', is_done:true  },
]
const SEED_LOG = [
  { id:'l1', entry_type:'ai',    content:'Sprint 14 kickoff complete. SOQL fix is P0. Raj leading, Sara on architecture.', created_at: new Date().toISOString() },
  { id:'l2', entry_type:'voice', content:'Follow up with Aman — rollup review stalling. Break into sub-stories.',          created_at: new Date().toISOString() },
  { id:'l3', entry_type:'note',  content:'LWC bridge polling at 30s works. embeddedservice_bootstrap issue resolved.',      created_at: new Date().toISOString() },
]
const SEED_CREW = [
  { id:'cr1', name:'Raj Kumar',   initials:'RK', color:'#6366f1', status:'online'  },
  { id:'cr2', name:'Sara Kim',    initials:'SK', color:'#8b5cf6', status:'online'  },
  { id:'cr3', name:'Aman Mehta',  initials:'AM', color:'#059669', status:'away'    },
  { id:'cr4', name:'Priya Patel', initials:'PP', color:'#f59e0b', status:'offline' },
]

// ── LS HELPERS ────────────────────────────────────────────
const LSGet = (k, d) => { try { return JSON.parse(localStorage.getItem('mer_'+k)) ?? d } catch{ return d } }
const LSSet = (k, v)  => localStorage.setItem('mer_'+k, JSON.stringify(v))

// ── HELPERS ───────────────────────────────────────────────
const fmt = d => new Date(d).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
const fmtDate = () => new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })

export default function App() {
  // ── STATE ─────────────────────────────────────────────
  const [view,      setViewState]  = useState(() => LSGet('view','board'))
  const [items,     setItems]      = useState(SEED_ITEMS)
  const [cols,      setCols]       = useState(SEED_COLS)
  const [logItems,  setLog]        = useState(SEED_LOG)
  const [crew,      setCrew]       = useState(SEED_CREW)
  const [colVis,    setColVis]     = useState(() => LSGet('colVis', { Title:true, Type:true, Status:true, Priority:true, Points:true, Assignee:true, 'Due Date':true, Sprint:false, Labels:false }))
  const [customFields, setCF]      = useState(() => LSGet('customFields', { item:[], project:[], sprint:[] }))
  const [logOpen,   setLogOpen]    = useState(() => LSGet('logOpen', true))
  const [toast,     setToastState] = useState({ show:false, emoji:'🎉', title:'', sub:'' })
  const [modal,     setModal]      = useState(null)  // 'add'|'voice'|'col'|'cf'|null
  const [cfTarget,  setCFTarget]   = useState('item')
  const [cfType,    setCFType]     = useState('text')
  const [recording, setRecording]  = useState(false)
  const [transcript,setTranscript] = useState('')
  const [voiceType, setVoiceType]  = useState('note')
  const [adminSec,  setAdminSec]   = useState(null)
  const [trackerTab, setTrackerTab]= useState('bigrock')
  const [demoTIdx,  setDemoTIdx]   = useState(0)
  const recTimerRef = useRef(null)

  const setView = (v) => { setViewState(v); LSSet('view', v) }

  // ── PERSIST ───────────────────────────────────────────
  useEffect(() => { LSSet('colVis', colVis) }, [colVis])
  useEffect(() => { LSSet('customFields', customFields) }, [customFields])
  useEffect(() => { LSSet('logOpen', logOpen) }, [logOpen])
  useEffect(() => { LSSet('items', items) }, [items])

  // ── LOAD FROM API ─────────────────────────────────────
  useEffect(() => {
    get('/api/items?sprint_id=').then(data => { if(data?.length) setItems(data) }).catch(()=>{})
    get('/api/log?project_id=').then(data => { if(data?.length) setLog(data) }).catch(()=>{})
    get('/api/columns?project_id=').then(data => { if(data?.length) setCols(data) }).catch(()=>{})
    get('/api/crew').then(data => { if(data?.length) setCrew(data) }).catch(()=>{})
    get('/api/custom-fields?workspace_id=').then(data => {
      if(data?.length) {
        const cf = { item:[], project:[], sprint:[] }
        data.forEach(f => { if(cf[f.target]) cf[f.target].push(f) })
        setCF(cf)
      }
    }).catch(()=>{})
  }, [])

  // ── TOAST ─────────────────────────────────────────────
  const showToast = (emoji, title, sub) => {
    setToastState({ show:true, emoji, title, sub })
    setTimeout(() => setToastState(t => ({ ...t, show:false })), 3400)
  }

  // ── CONFETTI ──────────────────────────────────────────
  const launchConfetti = () => {
    const layer = document.getElementById('conf')
    if (!layer) return
    layer.innerHTML = ''
    const colors = ['#d4943a','#f0b05a','#00c9a7','#3d9be9','#ff5470','#9b7dff','#f59e0b','#fff']
    for (let i = 0; i < 55; i++) {
      const p = document.createElement('div')
      const sz = 6 + Math.random() * 7
      p.style.cssText = `position:absolute;width:${sz}px;height:${sz}px;background:${colors[~~(Math.random()*colors.length)]};left:${Math.random()*100}%;top:-10px;border-radius:${Math.random()>.5?'50%':'2px'};animation:cffall ${1.2+Math.random()*1.3}s ease-in forwards;animation-delay:${Math.random()*.5}s;`
      layer.appendChild(p)
    }
    setTimeout(() => { if(layer) layer.innerHTML = '' }, 3000)
    showToast(EMOJIS[~~(Math.random()*EMOJIS.length)], TOASTS[~~(Math.random()*TOASTS.length)], 'Sprint 14 · Velocity climbing ⚡')
  }

  // ── ITEMS ─────────────────────────────────────────────
  const addItem = async (data) => {
    const newItem = {
      id: 'local-' + Date.now(),
      title: data.title,
      type: data.type || 'task',
      priority: data.priority || 'medium',
      points: parseInt(data.points) || 3,
      status: data.col || 'backlog',
      assignee_initials: data.assignee || 'RK',
      assignee_color: data.assigneeColor || '#6366f1',
      description: data.description || '',
    }
    setItems(prev => [...prev, newItem])
    showToast('⛰️', 'Item added!', `"${data.title.slice(0,35)}…" added to Sprint 14`)
    try {
      const saved = await post('/api/items', {
        title: data.title, type: data.type, priority: data.priority,
        points: parseInt(data.points)||3, status: data.col||'backlog',
        description: data.description,
      })
      setItems(prev => prev.map(i => i.id === newItem.id ? { ...saved, assignee_initials: newItem.assignee_initials, assignee_color: newItem.assignee_color } : i))
    } catch (_) {}
  }

  const cycleItemStatus = async (id) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    const idx  = cols.findIndex(c => c.slug === item.status)
    const next = cols[(idx + 1) % cols.length]
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: next.slug } : i))
    if (next.is_done) launchConfetti()
    try { await patch(`/api/items/${id}`, { status: next.slug }) } catch (_) {}
  }

  // ── LOG ───────────────────────────────────────────────
  const saveLogEntry = (text, type = 'note') => {
    const entry = { id: 'log-'+Date.now(), entry_type: type, content: text, created_at: new Date().toISOString() }
    setLog(prev => [entry, ...prev])
    LSSet('log', [entry, ...logItems])
    showToast('📝', type==='voice'?'Voice note saved':'Note logged', "Saved to Captain's Log")
    post('/api/log', { entry_type: type, content: text }).catch(()=>{})
  }

  // ── VOICE ─────────────────────────────────────────────
  const toggleRec = () => {
    if (!recording) {
      setRecording(true)
      setTranscript('Listening…')
      let d = 0
      recTimerRef.current = setInterval(() => {
        setTranscript('Listening' + '.'.repeat(++d % 4))
      }, 400)
    } else {
      clearInterval(recTimerRef.current)
      setRecording(false)
      const t = DEMO_TRANSCRIPTS[demoTIdx % DEMO_TRANSCRIPTS.length]
      setDemoTIdx(i => i+1)
      setTranscript(t)
    }
  }

  const createFromVoice = () => {
    if (!transcript || transcript.startsWith('Listening') || transcript.startsWith('Click')) {
      setModal(null); return
    }
    saveLogEntry(transcript, voiceType === 'note' ? 'voice' : 'ai')
    setModal(null)
    setTranscript('')
    setRecording(false)
    clearInterval(recTimerRef.current)
  }

  // ── CUSTOM FIELDS ─────────────────────────────────────
  const addCustomField = (name, type, target) => {
    const field = { id:'cf-'+Date.now(), name, field_type: type, target }
    setCF(prev => ({ ...prev, [target]: [...prev[target], field] }))
    post('/api/custom-fields', { name, field_type: type, target, workspace_id: 'default' }).catch(()=>{})
  }
  const deleteCustomField = (id, target) => {
    setCF(prev => ({ ...prev, [target]: prev[target].filter(f => f.id !== id) }))
    del(`/api/custom-fields/${id}`).catch(()=>{})
  }

  // ── COLUMN PREFS ──────────────────────────────────────
  const toggleCol = (col) => {
    setColVis(prev => ({ ...prev, [col]: !prev[col] }))
  }

  // ── VIEWS ─────────────────────────────────────────────
  const views = [
    { id:'board',   label:'Summit Board',   icon:'fa-chart-kanban'  },
    { id:'list',    label:'Manifest',       icon:'fa-list-ul'       },
    { id:'gantt',   label:'Expedition Map', icon:'fa-bars-progress' },
    { id:'tracker', label:'Field Notes',    icon:'fa-table-cells'   },
    { id:'metrics', label:'Observatory',    icon:'fa-chart-area'    },
    { id:'admin',   label:'Base Camp',      icon:'fa-sliders'       },
  ]

  const doneCount = items.filter(i => i.status === 'peak').length
  const totalPts  = items.reduce((a,b) => a + (b.points||0), 0)
  const donePts   = items.filter(i => i.status==='peak').reduce((a,b) => a+(b.points||0), 0)
  const pct       = totalPts ? Math.round(donePts/totalPts*100) : 0

  return (
    <div className="app-shell">
      {/* ── TOPBAR ── */}
      <Topbar onVoice={()=>setModal('voice')} onLog={()=>setLogOpen(v=>{LSSet('logOpen',!v);return !v})} />

      <div className="app-body">
        {/* ── SIDEBAR ── */}
        <Sidebar view={view} setView={setView} crew={crew} items={items} />

        {/* ── MAIN ── */}
        <div className="main-area">
          <div className="page-head">
            <div className="bc">
              <i className="fa-solid fa-house-chimney"></i>
              <span style={{color:'var(--t3)'}}>RevOps</span>
              <span className="bc-sep"> › </span>
              <span style={{color:'var(--t2)'}}>Sprint 14 — Revenue Horizon</span>
            </div>
            <div className="pt-row">
              <div className="page-title">Sprint 14 — Revenue Horizon</div>
              <div className="s-tag"><div className="s-dot"></div> Active</div>
            </div>
            <div className="pm">
              <div className="pmi"><i className="fa-regular fa-calendar"></i> Mar 1 – 14, 2026</div>
              <div className="pmi">
                <div className="prog-t"><div className="prog-f" style={{width:pct+'%'}}></div></div>
                {pct}% complete
              </div>
              <div className="pmi"><i className="fa-solid fa-bolt" style={{color:'var(--gold)'}}></i> <span style={{fontFamily:'var(--fm)'}}>{totalPts}pt</span></div>
              <div className="pmi" style={{color:'var(--jade)'}}><i className="fa-solid fa-circle-check"></i> <span style={{fontFamily:'var(--fm)'}}>{donePts}pt</span> done</div>
            </div>
          </div>

          {/* ── VIEW TABS ── */}
          <div className="vtabs">
            {views.map(v => (
              <button key={v.id} className={`vt${view===v.id?' active':''}`} onClick={()=>setView(v.id)}>
                <i className={`fa-solid ${v.icon}`}></i> {v.label}
              </button>
            ))}
            <div className="vt-acts">
              <button className="btn-g" onClick={()=>setModal('col')}><i className="fa-solid fa-table-columns"></i> Columns</button>
              <button className="btn-p" onClick={()=>setModal('add')}><i className="fa-solid fa-mountain"></i> Summit Item</button>
            </div>
          </div>

          {/* ── VIEW CONTENT ── */}
          <div style={{display:'flex',flex:1,overflow:'hidden',flexDirection:view==='board'?'row':'column'}}>

            {view === 'board' && (
              <BoardView items={items} cols={cols} onCycle={cycleItemStatus} onAdd={()=>setModal('add')} />
            )}
            {view === 'list' && (
              <ListView items={items} cols={cols} colVis={colVis} customFields={customFields.item}
                onCycle={cycleItemStatus} onAdd={()=>setModal('add')} onAddCol={()=>setModal('col')} />
            )}
            {view === 'gantt' && <GanttView items={items} />}
            {view === 'tracker' && <TrackerView tab={trackerTab} setTab={setTrackerTab} />}
            {view === 'metrics' && <MetricsView items={items} crew={crew} />}
            {view === 'admin' && (
              <AdminView customFields={customFields} adminSec={adminSec} setAdminSec={setAdminSec}
                onAddField={(target)=>{ setCFTarget(target); setModal('cf') }}
                onDelField={deleteCustomField} />
            )}

            {/* Captain's Log — shown on board view */}
            {view === 'board' && (
              <CaptainsLog open={logOpen} entries={logItems} onClose={()=>setLogOpen(v=>{LSSet('logOpen',false);return false})}
                onSave={saveLogEntry} onVoice={()=>setModal('voice')} />
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {modal === 'add' && <AddModal onClose={()=>setModal(null)} onSubmit={(d)=>{ addItem(d); setModal(null) }} customFields={customFields.item} />}
      {modal === 'voice' && <VoiceModal recording={recording} transcript={transcript} voiceType={voiceType}
        onToggle={toggleRec} onSetType={setVoiceType} onCreate={createFromVoice} onClose={()=>{ setModal(null); clearInterval(recTimerRef.current); setRecording(false); }} />}
      {modal === 'col' && <ColModal colVis={colVis} onToggle={toggleCol} onClose={()=>setModal(null)}
        customFields={customFields.item} onAddField={()=>{ setModal('cf'); setCFTarget('item') }} />}
      {modal === 'cf' && <CFModal target={cfTarget} cfType={cfType} onSetType={setCFType}
        onClose={()=>setModal(null)}
        onSave={(name,type)=>{ addCustomField(name,type,cfTarget); setModal(null); showToast('✨','Field added!',`"${name}" added to ${cfTarget} fields`) }} />}

      {/* Confetti + Toast */}
      <div className="conf-layer" id="conf"></div>
      <div className={`toast${toast.show?' show':''}`}>
        <div className="toast-emoji">{toast.emoji}</div>
        <div><div className="toast-title">{toast.title}</div><div className="toast-sub">{toast.sub}</div></div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  TOPBAR
// ════════════════════════════════════════════════════════
function Topbar({ onVoice, onLog }) {
  const [ws, setWs] = useState('RevOps')
  return (
    <div className="topbar">
      <div className="logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f0b05a"/><stop offset="100%" stopColor="#c9823a"/>
            </linearGradient>
          </defs>
          <path d="M16 2L29 9v7c0 8.5-6 14-13 15C9 30 3 24.5 3 16V9z" fill="#0f1420" stroke="url(#lg)" strokeWidth="1.2"/>
          <line x1="16" y1="10" x2="16" y2="22" stroke="url(#lg)" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="10.5" y1="15.5" x2="21.5" y2="15.5" stroke="url(#lg)" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="16" cy="10" r="2.2" fill="url(#lg)"/>
          <path d="M10.5 22 Q8 20.5 10.5 18" stroke="url(#lg)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M21.5 22 Q24 20.5 21.5 18" stroke="url(#lg)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <line x1="8.5" y1="21.5" x2="12.5" y2="21.5" stroke="url(#lg)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="19.5" y1="21.5" x2="23.5" y2="21.5" stroke="url(#lg)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div>
          <div className="logo-name">Meridian</div>
          <div className="logo-sub">Peak Performance</div>
        </div>
      </div>
      <div className="tb-sep"/>
      {['RevOps','Platform','Infra'].map(w => (
        <button key={w} className={`ws-btn${ws===w?' active':''}`} onClick={()=>setWs(w)}>
          {w==='RevOps' && <i className="fa-solid fa-bolt" style={{color:'var(--gold)',fontSize:'10px'}}/>}
          {w==='Platform' && <i className="fa-solid fa-rocket" style={{fontSize:'10px'}}/>}
          {w==='Infra' && <i className="fa-solid fa-server" style={{fontSize:'10px'}}/>}
          {w}
        </button>
      ))}
      <div className="tb-right">
        <button className="voice-btn" onClick={onVoice}><div className="vdot"/><i className="fa-solid fa-microphone"/> Voice Log</button>
        <button className="ib" onClick={onLog} title="Captain's Log (Cmd+L)"><i className="fa-solid fa-book-open-cover"/></button>
        <div className="notif-wrap"><button className="ib"><i className="fa-regular fa-bell"/></button><div className="notif-dot"/></div>
        <button className="ib"><i className="fa-solid fa-magnifying-glass"/></button>
        <div className="tb-sep"/>
        <div className="user-av">RK</div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  SIDEBAR
// ════════════════════════════════════════════════════════
function Sidebar({ view, setView, crew, items }) {
  const navItems = [
    { id:'board',   label:'Summit Board',   icon:'fa-chart-kanban',  cnt: items.length },
    { id:'list',    label:'Manifest',       icon:'fa-list-ul'        },
    { id:'gantt',   label:'Expedition Map', icon:'fa-bars-progress'  },
    { id:'tracker', label:'Field Notes',    icon:'fa-table-cells',   cnt: 3 },
    { id:'metrics', label:'Observatory',    icon:'fa-chart-area'     },
    { id:'admin',   label:'Base Camp',      icon:'fa-sliders',       special:'Admin' },
  ]
  const statusColor = { online:'var(--jade)', away:'var(--sun)', offline:'var(--t4)' }
  return (
    <div className="sidebar">
      <div className="sb-sect">
        <div className="sb-lbl">Navigate</div>
        {navItems.map(n => (
          <div key={n.id} className={`si${view===n.id?' active':''}`} onClick={()=>setView(n.id)}>
            <i className={`fa-solid ${n.icon} si-ico`}/>
            {n.label}
            {n.special ? <span className="sb-cnt" style={{background:'var(--golds)',color:'var(--gold)'}}>{n.special}</span>
             : n.cnt != null ? <span className="sb-cnt">{n.cnt}</span> : null}
          </div>
        ))}
      </div>
      <div className="sb-div"/>
      <div className="sb-sect">
        <div className="sb-lbl">Expeditions</div>
        <div className="si active"><i className="fa-solid fa-mountain-sun si-ico"/>Sprint 14 <span className="sb-cnt">{items.length}</span></div>
        <div className="si"><i className="fa-solid fa-flag si-ico"/>Sprint 13</div>
        <div className="sb-add"><i className="fa-solid fa-plus" style={{fontSize:'10px'}}/> New Expedition</div>
      </div>
      <div className="sb-div"/>
      <div className="sb-sect">
        <div className="sb-lbl">Campaigns</div>
        <div className="si"><span className="si-ico" style={{color:'#6366f1',fontSize:'10px'}}>●</span> RevOps Initiative</div>
        <div className="si"><span className="si-ico" style={{color:'#8b5cf6',fontSize:'10px'}}>●</span> Experience Cloud</div>
        <div className="si"><span className="si-ico" style={{color:'#059669',fontSize:'10px'}}>●</span> Infrastructure</div>
        <div className="sb-add"><i className="fa-solid fa-plus" style={{fontSize:'10px'}}/> New Campaign</div>
      </div>
      <div className="sb-crew-sect">
        <div className="crew-lbl">Crew</div>
        {crew.map(c => (
          <div key={c.id} className="cm">
            <div className="cav" style={{background:c.color}}>{c.initials}</div>
            {c.name}
            <div className="cst" style={{background:statusColor[c.status]||'var(--t4)'}}/>
          </div>
        ))}
        <div className="sb-add"><i className="fa-solid fa-plus" style={{fontSize:'10px'}}/> Add Crew</div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  BOARD VIEW
// ════════════════════════════════════════════════════════
function BoardView({ items, cols, onCycle, onAdd }) {
  const typeIco = { epic:'fa-layer-group', story:'fa-circle-dot', bug:'fa-bug', task:'fa-circle-check' }
  return (
    <div className="board-scroll">
      <div className="board">
        {cols.map(col => {
          const colItems = items.filter(i => i.status === col.slug)
          return (
            <div key={col.id} className="board-col">
              <div className="col-header">
                <div className="col-dot" style={{background:col.color}}/>
                <span className="col-nm">{col.name}</span>
                <span className="col-ct">{colItems.length}</span>
              </div>
              {colItems.map(item => (
                <div key={item.id} className={`card`} data-col={item.status}
                  onClick={()=>{ if(col.is_done) onCycle(item.id) }}
                  style={{'--accent': CARD_ACCENTS[item.status]||'none'}}>
                  <style>{`.card[data-col="${item.status}"]:hover::before{background:${CARD_ACCENTS[item.status]||'none'}}`}</style>
                  <div className={`type-badge type-${item.type||'task'}`}>
                    <i className={`fa-solid ${typeIco[item.type]||'fa-circle-check'}`}/> {item.type||'task'}
                  </div>
                  <div className="card-title">{item.title}</div>
                  <div className="card-foot">
                    <span className="pts-badge"><i className="fa-solid fa-fire-flame-curved" style={{fontSize:'8px',color:'var(--sun)'}}/>{item.points||0}pt</span>
                    <span className={`prio-badge prio-${item.priority||'medium'}`}>{item.priority||'medium'}</span>
                    {item.assignee_initials && <div className="cav-sm" style={{background:item.assignee_color||'#6366f1'}}>{item.assignee_initials}</div>}
                  </div>
                </div>
              ))}
              <button className="add-card-btn" onClick={onAdd}><i className="fa-solid fa-plus" style={{fontSize:'10px'}}/> Summit Item</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  LIST VIEW
// ════════════════════════════════════════════════════════
function ListView({ items, cols, colVis, customFields, onCycle, onAdd, onAddCol }) {
  const colDef = [
    { key:'Title', render: i => <td key="t" style={{fontWeight:500,color:'var(--t1)',paddingLeft:'16px'}}>{i.title}</td> },
    { key:'Type',  render: i => <td key="ty"><span className={`type-badge type-${i.type||'task'}`}>{i.type||'task'}</span></td> },
    { key:'Status',render: i => {
      const col = cols.find(c=>c.slug===i.status)
      return <td key="s"><span className={`spill sp-${i.status}`} onClick={()=>onCycle(i.id)}>
        <i className="fa-solid fa-circle"/>{col?.name||i.status}</span></td>
    }},
    { key:'Priority', render: i => <td key="pr"><span className={`prio-badge prio-${i.priority||'medium'}`}>{i.priority||'medium'}</span></td> },
    { key:'Points',   render: i => <td key="pts" style={{fontFamily:'var(--fm)',fontSize:'12px'}}>{i.points||0}pt</td> },
    { key:'Assignee', render: i => <td key="a"><div style={{display:'flex',alignItems:'center',gap:'6px'}}>
      <div className="cav-sm" style={{background:i.assignee_color||'#6366f1',width:'20px',height:'20px',fontSize:'8px'}}>{i.assignee_initials||'?'}</div>
    </div></td> },
    { key:'Due Date', render: i => <td key="d" style={{fontSize:'11.5px',color:'var(--t3)'}}>Mar {10+Math.floor(Math.random()*4)}</td> },
    { key:'Sprint',   render: i => <td key="sp" style={{fontSize:'11.5px',color:'var(--t3)'}}>Sprint 14</td> },
    { key:'Labels',   render: i => <td key="l" style={{fontSize:'11.5px',color:'var(--t3)'}}>—</td> },
  ]
  const visibleCols = colDef.filter(c => colVis[c.key])
  return (
    <div className="scroll">
      <table className="m-table">
        <thead>
          <tr>
            {visibleCols.map(c => <th key={c.key}>{c.key}</th>)}
            {customFields.map(f => <th key={f.id}>{f.name}</th>)}
            <th><button className="add-col-btn" onClick={onAddCol}><i className="fa-solid fa-plus"/> Col</button></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              {visibleCols.map(c => c.render(item))}
              {customFields.map(f => <td key={f.id}><input style={{background:'transparent',border:'none',color:'var(--t2)',fontSize:'12px',width:'100%',outline:'none',fontFamily:'var(--fw)'}} placeholder="—"/></td>)}
              <td/>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="add-row-bar" onClick={onAdd}><i className="fa-solid fa-plus" style={{fontSize:'10px'}}/> Summit Item</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  GANTT VIEW
// ════════════════════════════════════════════════════════
function GanttView({ items }) {
  const bars = [
    {s:0,sp:3},{s:1,sp:4},{s:2,sp:3},{s:3,sp:3},{s:0,sp:1},{s:1,sp:2},{s:2,sp:4}
  ]
  const colBg = { backlog:'#3d4a63', summit:'linear-gradient(90deg,#3d9be9,#5a67e8)', ascent:'linear-gradient(90deg,#f59e0b,#ff5470)', basecamp:'linear-gradient(90deg,#9b7dff,#5a67e8)', peak:'linear-gradient(90deg,#00c9a7,#d4943a)' }
  const days = ['Mar 1','Mar 3','Mar 5','Mar 7','Mar 9','Mar 11','Mar 13']
  return (
    <div className="scroll">
      <table className="gantt-table">
        <thead><tr>
          <th style={{width:'210px',position:'sticky',left:0,zIndex:3,background:'var(--bg1)'}}>Item</th>
          <th style={{width:'60px'}}>Pts</th><th style={{width:'65px'}}>Crew</th>
          {days.map(d=><th key={d}>{d}</th>)}
        </tr></thead>
        <tbody>
          {items.slice(0,7).map((item,idx)=>{
            const g = bars[idx % bars.length]
            const bg = colBg[item.status]||'#3d4a63'
            const cells = []
            for(let d=0;d<days.length;d++){
              if(d===g.s) cells.push(<td key={d} colSpan={g.sp} className="gantt-bar-cell"><div className="gantt-bar" style={{background:bg}}>{item.status==='peak'?'✓ ':''}{item.title.slice(0,24)}…</div></td>)
              else if(d>g.s && d<g.s+g.sp) continue
              else cells.push(<td key={d}/>)
            }
            return (
              <tr key={item.id}>
                <td style={{position:'sticky',left:0,background:'var(--bg0)',fontWeight:500,color:'var(--t1)'}}>{item.title.slice(0,28)}…</td>
                <td style={{fontFamily:'var(--fm)',fontSize:'11px'}}>{item.points}pt</td>
                <td><div className="cav-sm" style={{background:item.assignee_color||'#6366f1',width:'20px',height:'20px',fontSize:'8px'}}>{item.assignee_initials||'?'}</div></td>
                {cells}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  TRACKER VIEW
// ════════════════════════════════════════════════════════
function TrackerView({ tab, setTab }) {
  const [localTab, setLocalTab] = useState(tab)
  const tabs = [
    { id:'bigrock', label:'Big Rocks', icon:'fa-mountain', count:4 },
    { id:'okr',     label:'OKRs',      icon:'fa-bullseye', count:2 },
    { id:'risk',    label:'Risk Radar',icon:'fa-shield-halved', count:3 },
  ]
  const selectTab = (id) => { setLocalTab(id); setTab(id) }
  const bigRockData = [
    { initiative:'Platform Migration', category:'Engineering', priority:'P0', summit:'✅', owner:'Alex Chen', status:'On Track' },
    { initiative:'Mobile App Redesign', category:'Design', priority:'P1', summit:'✅', owner:'Sarah Kim', status:'At Risk' },
    { initiative:'API v3 Launch', category:'Engineering', priority:'P0', summit:'✅', owner:'Jordan Lee', status:'Complete' },
    { initiative:'Sales Portal', category:'Sales', priority:'P2', summit:'—', owner:'Marcus J.', status:'Blocked' },
  ]
  const statusCls = { 'On Track':'sp-summit','At Risk':'sp-ascent','Complete':'sp-peak','Blocked':'sp-backlog','Not Started':'sp-backlog','Monitoring':'sp-ascent','Controlled':'sp-summit','Mitigated':'sp-peak' }
  return (
    <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
      <div className="tr-tabs">
        {tabs.map(t=>(
          <button key={t.id} className={`tr-tab${localTab===t.id?' active':''}`} onClick={()=>selectTab(t.id)}>
            <i className={`fa-solid ${t.icon}`}/> {t.label} <span className="tc">{t.count}</span>
          </button>
        ))}
        <button className="tr-plus">＋</button>
        <div style={{marginLeft:'auto',padding:'7px 0'}}>
          <button className="btn-p" style={{fontSize:'11px',padding:'5px 12px'}}><i className="fa-solid fa-plus"/> Add Row</button>
        </div>
      </div>
      <div className="scroll">
        {localTab === 'bigrock' && (
          <table className="m-table"><thead><tr>
            <th style={{paddingLeft:'16px'}}>Initiative</th><th>Category</th><th>Priority</th>
            <th>Summit?</th><th>Owner</th><th>Status</th><th>Description</th>
          </tr></thead><tbody>
            {bigRockData.map((r,i)=>(
              <tr key={i}><td style={{paddingLeft:'16px'}}>{r.initiative}</td>
                <td><span className="type-badge type-task" style={{textTransform:'none'}}>{r.category}</span></td>
                <td><span className="prio-badge prio-high">{r.priority}</span></td>
                <td style={{fontSize:'15px'}}>{r.summit}</td><td style={{fontSize:'12px',color:'var(--t2)'}}>{r.owner}</td>
                <td><span className={`spill ${statusCls[r.status]||'sp-backlog'}`}>{r.status}</span></td>
                <td style={{fontSize:'11px',color:'var(--t3)'}}><input style={{background:'transparent',border:'none',color:'var(--t2)',fontSize:'12px',outline:'none',fontFamily:'var(--fw)',width:'100%'}} defaultValue="See tracker…"/></td>
              </tr>
            ))}
          </tbody></table>
        )}
        {localTab === 'okr' && (
          <table className="m-table"><thead><tr><th style={{paddingLeft:'16px'}}>Objective</th><th>Category</th><th>Priority</th><th>Owner</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td style={{paddingLeft:'16px'}}>Customer Dashboard Analytics</td><td><span className="type-badge type-story">Product</span></td><td><span className="prio-badge prio-high">P1</span></td><td>Priya Patel</td><td><span className="spill sp-summit">On Track</span></td></tr>
            <tr><td style={{paddingLeft:'16px'}}>Security Audit Remediation</td><td><span className="type-badge type-bug">Ops</span></td><td><span className="prio-badge prio-high">P0</span></td><td>Dev Singh</td><td><span className="spill sp-backlog">Not Started</span></td></tr>
          </tbody></table>
        )}
        {localTab === 'risk' && (
          <table className="m-table"><thead><tr><th style={{paddingLeft:'16px'}}>Risk</th><th>Likelihood</th><th>Impact</th><th>Owner</th><th>Mitigation</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td style={{paddingLeft:'16px'}}>API rate limits in prod</td><td><span className="prio-badge prio-high">High</span></td><td><span className="prio-badge prio-high">High</span></td><td>Raj K.</td><td style={{fontSize:'11px',color:'var(--t3)'}}>Caching + bulkification</td><td><span className="spill sp-ascent">Monitoring</span></td></tr>
            <tr><td style={{paddingLeft:'16px'}}>Sprint scope creep</td><td><span className="prio-badge prio-medium">Med</span></td><td><span className="prio-badge prio-medium">Med</span></td><td>Sara K.</td><td style={{fontSize:'11px',color:'var(--t3)'}}>Daily standup</td><td><span className="spill sp-summit">Controlled</span></td></tr>
            <tr><td style={{paddingLeft:'16px'}}>DB migration data loss</td><td><span className="prio-badge prio-low">Low</span></td><td><span className="prio-badge prio-high">High</span></td><td>Aman M.</td><td style={{fontSize:'11px',color:'var(--t3)'}}>Full backup before run</td><td><span className="spill sp-peak">Mitigated</span></td></tr>
          </tbody></table>
        )}
        <div className="add-row-bar"><i className="fa-solid fa-plus" style={{fontSize:'10px'}}/> Add Row</div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  METRICS VIEW
// ════════════════════════════════════════════════════════
function MetricsView({ items, crew }) {
  const total = items.reduce((a,b)=>a+(b.points||0),0)
  const done  = items.filter(i=>i.status==='peak').reduce((a,b)=>a+(b.points||0),0)
  const statusColor = { online:'var(--jade)', away:'var(--sun)', offline:'var(--t4)' }
  return (
    <div className="scroll">
      <div className="stats-grid">
        <div className="stat-card stat-sky">
          <div className="stat-ico" style={{background:'var(--skys)'}}><i className="fa-solid fa-bolt" style={{color:'var(--sky)'}}/></div>
          <div className="stat-val">{total}</div><div className="stat-lbl">Total Points</div>
          <div className="stat-delta delta-up"><i className="fa-solid fa-arrow-trend-up"/> +8pt vs Sprint 13</div>
        </div>
        <div className="stat-card stat-jade">
          <div className="stat-ico" style={{background:'var(--jades)'}}><i className="fa-solid fa-mountain" style={{color:'var(--jade)'}}/></div>
          <div className="stat-val">{done}</div><div className="stat-lbl">Peaks Reached</div>
          <div className="stat-delta delta-up"><i className="fa-solid fa-arrow-trend-up"/> {total?Math.round(done/total*100):0}% velocity</div>
        </div>
        <div className="stat-card stat-rose">
          <div className="stat-ico" style={{background:'var(--roses)'}}><i className="fa-solid fa-triangle-exclamation" style={{color:'var(--rose)'}}/></div>
          <div className="stat-val">1</div><div className="stat-lbl">Active Blockers</div>
          <div className="stat-delta delta-dn"><i className="fa-solid fa-arrow-up"/> +1 today</div>
        </div>
        <div className="stat-card stat-gold">
          <div className="stat-ico" style={{background:'var(--golds)'}}><i className="fa-solid fa-hourglass-half" style={{color:'var(--gold)'}}/></div>
          <div className="stat-val">9</div><div className="stat-lbl">Days to Summit</div>
          <div className="stat-delta delta-n"><i className="fa-regular fa-calendar"/> Mar 14</div>
        </div>
      </div>
      <div className="chart-card">
        <div className="chart-title">Burndown — Sprint 14</div>
        <div className="chart-sub">Story points remaining per day</div>
        <div className="bd-bars">
          {[[42,'Day 1'],[37,'Day 2'],[34,'Day 3'],[29,'Day 4'],[26,'Day 5'],[23,'Today'],[17,'Proj.'],[11,'Proj.'],[6,'Proj.'],[0,'Target']].map(([pts,lbl],i)=>{
            const ht = Math.round(pts/42*100)
            const isToday = i===5
            const isProj = i>5
            return (
              <div key={i} className="bd-bar" style={{
                height:Math.max(ht,3)+'%',
                background: isProj?'rgba(0,201,167,.07)':isToday?'linear-gradient(180deg,var(--jade),rgba(0,201,167,.25))':'linear-gradient(180deg,var(--gold),rgba(212,148,58,.15))',
                border: isProj?'1px dashed rgba(0,201,167,.2)':isToday?'1.5px solid rgba(0,201,167,.4)':'none'
              }}>
                <div className="bd-tip">{lbl} — {pts}pt{isToday?' ◀':''}</div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="chart-card">
        <div className="chart-title">Crew Workload</div>
        <div className="chart-sub">Points assigned vs completed</div>
        {crew.map(c=>{
          const assigned = items.filter(i=>i.assignee_initials===c.initials).reduce((a,b)=>a+(b.points||0),0)
          const cdone    = items.filter(i=>i.assignee_initials===c.initials&&i.status==='peak').reduce((a,b)=>a+(b.points||0),0)
          const pct      = assigned ? Math.round(cdone/assigned*100) : 0
          return (
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'8px'}}>
              <div className="cav-sm" style={{background:c.color,width:'26px',height:'26px',fontSize:'9px',flexShrink:0}}>{c.initials}</div>
              <div style={{fontSize:'12px',color:'var(--t2)',width:'90px',flexShrink:0}}>{c.name}</div>
              <div style={{flex:1,height:'8px',background:'var(--bg4)',borderRadius:'4px',overflow:'hidden'}}>
                <div style={{height:'100%',width:pct+'%',background:'linear-gradient(90deg,var(--jade),var(--gold))',borderRadius:'4px',transition:'width .5s'}}/>
              </div>
              <div style={{fontFamily:'var(--fm)',fontSize:'11px',color:'var(--t3)',width:'55px',textAlign:'right'}}>{cdone}/{assigned}pt</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  ADMIN VIEW
// ════════════════════════════════════════════════════════
function AdminView({ customFields, adminSec, setAdminSec, onAddField, onDelField }) {
  const fieldTypeIco = { text:'fa-font', number:'fa-hashtag', date:'fa-calendar', select:'fa-list', checkbox:'fa-square-check', url:'fa-link' }
  const fieldTypeBg  = { text:'var(--golds)', number:'var(--skys)', date:'var(--jades)', select:'var(--lavs)', checkbox:'var(--suns)', url:'var(--roses)' }
  const fieldTypeClr = { text:'var(--gold2)', number:'var(--sky)', date:'var(--jade)', select:'var(--lav)', checkbox:'var(--sun)', url:'var(--rose)' }

  const sections = [
    { id:'item',    icon:'fa-layer-group', bg:'var(--golds)', color:'var(--gold)', title:'Summit Item Fields', sub:'Custom fields on work items — text, numbers, dates, dropdowns.' },
    { id:'project', icon:'fa-diagram-project', bg:'var(--skys)', color:'var(--sky)', title:'Campaign Fields', sub:'Custom fields on campaigns/projects.' },
    { id:'sprint',  icon:'fa-mountain-sun', bg:'var(--jades)', color:'var(--jade)', title:'Expedition Fields', sub:'Custom fields on expeditions/sprints.' },
    { id:'statuses',icon:'fa-circle-half-stroke', bg:'var(--lavs)', color:'var(--lav)', title:'Board Columns', sub:'Add, rename, or reorder board columns.' },
    { id:'crew',    icon:'fa-users', bg:'var(--roses)', color:'var(--rose)', title:'Crew Management', sub:'Manage team members, roles, and colors.' },
    { id:'integrations', icon:'fa-plug', bg:'var(--suns)', color:'var(--sun)', title:'Integrations', sub:'Connect Slack, GitHub, Jira and more.' },
  ]

  if (adminSec && ['item','project','sprint'].includes(adminSec)) {
    const sec = sections.find(s=>s.id===adminSec)
    const fields = customFields[adminSec] || []
    return (
      <div className="scroll">
        <button className="ph-back" onClick={()=>setAdminSec(null)}><i className="fa-solid fa-arrow-left"/> Back to Admin</button>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
          <div className="adm-ico" style={{background:sec.bg}}><i className={`fa-solid ${sec.icon}`} style={{color:sec.color}}/></div>
          <div>
            <div style={{fontFamily:'var(--fd)',fontSize:'20px',fontWeight:600,fontStyle:'italic',color:'var(--t1)'}}>{sec.title}</div>
            <div style={{fontSize:'12px',color:'var(--t3)',marginTop:'3px'}}>{fields.length} custom field{fields.length!==1?'s':''} configured</div>
          </div>
        </div>
        {fields.length === 0 && (
          <div className="empty-state">
            <i className="fa-solid fa-layer-group"/>
            <h3>No custom fields yet</h3>
            <p>Add your first custom field to tailor Meridian to your workflow.</p>
          </div>
        )}
        {fields.map(f => (
          <div key={f.id} className="field-item">
            <div className="field-ico" style={{background:fieldTypeBg[f.field_type]||'var(--golds)'}}>
              <i className={`fa-solid ${fieldTypeIco[f.field_type]||'fa-font'}`} style={{color:fieldTypeClr[f.field_type]||'var(--gold2)'}}/>
            </div>
            <span className="field-nm">{f.name}</span>
            <span className="field-type-lbl">{f.field_type}</span>
            <button className="field-del" onClick={()=>onDelField(f.id, adminSec)}><i className="fa-solid fa-trash"/></button>
          </div>
        ))}
        <button className="add-field-btn" onClick={()=>onAddField(adminSec)}>
          <i className="fa-solid fa-plus"/> Add Custom Field
        </button>
      </div>
    )
  }

  if (adminSec === 'statuses') {
    return (
      <div className="scroll">
        <button className="ph-back" onClick={()=>setAdminSec(null)}><i className="fa-solid fa-arrow-left"/> Back</button>
        <div style={{fontFamily:'var(--fd)',fontSize:'20px',fontWeight:600,fontStyle:'italic',color:'var(--t1)',marginBottom:'16px'}}>Board Columns</div>
        {['Base Camp','Summit Ready','In Ascent','At Base Camp','Peak Reached'].map((n,i)=>(
          <div key={i} className="field-item">
            <div style={{width:'14px',height:'14px',borderRadius:'50%',background:Object.values(COL_COLORS)[i],flexShrink:0}}/>
            <input defaultValue={n} style={{flex:1,background:'transparent',border:'none',outline:'none',fontSize:'13px',fontWeight:500,color:'var(--t1)',fontFamily:'var(--fw)'}}/>
            <button className="field-del"><i className="fa-solid fa-trash"/></button>
          </div>
        ))}
        <button className="add-field-btn"><i className="fa-solid fa-plus"/> Add Column</button>
      </div>
    )
  }

  if (adminSec === 'crew') {
    return (
      <div className="scroll">
        <button className="ph-back" onClick={()=>setAdminSec(null)}><i className="fa-solid fa-arrow-left"/> Back</button>
        <div style={{fontFamily:'var(--fd)',fontSize:'20px',fontWeight:600,fontStyle:'italic',color:'var(--t1)',marginBottom:'16px'}}>Crew Management</div>
        {[{n:'Raj Kumar',i:'RK',c:'#6366f1',r:'Lead Developer'},{n:'Sara Kim',i:'SK',c:'#8b5cf6',r:'Architect'},{n:'Aman Mehta',i:'AM',c:'#059669',r:'Developer'},{n:'Priya Patel',i:'PP',c:'#f59e0b',r:'QA Engineer'}].map((m,idx)=>(
          <div key={idx} className="field-item">
            <div className="cav" style={{background:m.c}}>{m.i}</div>
            <div style={{flex:1}}><div style={{fontSize:'13px',fontWeight:500,color:'var(--t1)'}}>{m.n}</div><div style={{fontSize:'11px',color:'var(--t3)',marginTop:'2px'}}>{m.r}</div></div>
            <button className="btn-g" style={{fontSize:'11px',padding:'4px 10px'}}>Edit</button>
          </div>
        ))}
        <button className="add-field-btn"><i className="fa-solid fa-plus"/> Add Crew Member</button>
      </div>
    )
  }

  if (adminSec === 'integrations') {
    return (
      <div className="scroll">
        <button className="ph-back" onClick={()=>setAdminSec(null)}><i className="fa-solid fa-arrow-left"/> Back</button>
        <div style={{fontFamily:'var(--fd)',fontSize:'20px',fontWeight:600,fontStyle:'italic',color:'var(--t1)',marginBottom:'16px'}}>Integrations</div>
        {[{name:'Slack',icon:'fa-slack',bg:'rgba(74,21,75,.3)',c:'#e01e5a',status:'Coming soon'},{name:'GitHub',icon:'fa-github',bg:'rgba(36,41,47,.5)',c:'#fff',status:'Coming soon'},{name:'Jira',icon:'fa-jira',bg:'rgba(0,82,204,.2)',c:'#0052cc',status:'Coming soon'}].map((int,i)=>(
          <div key={i} className="field-item">
            <div className="field-ico" style={{background:int.bg}}><i className={`fa-brands ${int.icon}`} style={{color:int.c}}/></div>
            <span className="field-nm">{int.name}</span>
            <span className="field-type-lbl">{int.status}</span>
          </div>
        ))}
      </div>
    )
  }

  // Default admin home
  return (
    <div className="scroll">
      <div style={{marginBottom:'20px'}}>
        <div style={{fontFamily:'var(--fd)',fontSize:'22px',fontWeight:600,fontStyle:'italic',color:'var(--t1)',marginBottom:'5px'}}>Base Camp — Admin Center</div>
        <div style={{fontSize:'12.5px',color:'var(--t3)'}}>Configure Meridian to match your workflow. All changes save automatically.</div>
      </div>
      <div className="admin-grid">
        {sections.map(s => (
          <div key={s.id} className="adm-card" onClick={()=>setAdminSec(s.id)}>
            <div className="adm-ico" style={{background:s.bg}}><i className={`fa-solid ${s.icon}`} style={{color:s.color}}/></div>
            <div className="adm-title">{s.title}</div>
            <div className="adm-sub">{s.sub}</div>
            {['item','project','sprint'].includes(s.id) && customFields[s.id]?.length > 0 && (
              <div style={{marginTop:'8px',fontSize:'11px',color:'var(--gold2)',fontWeight:600}}>{customFields[s.id].length} field{customFields[s.id].length!==1?'s':''} configured</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  CAPTAIN'S LOG
// ════════════════════════════════════════════════════════
function CaptainsLog({ open, entries, onClose, onSave, onVoice }) {
  const [text, setText] = useState('')
  const badgeMap = {
    voice: <span className="log-badge lb-v"><i className="fa-solid fa-microphone"/> Voice</span>,
    ai:    <span className="log-badge lb-ai"><i className="fa-solid fa-wand-magic-sparkles"/> AI</span>,
    note:  <span className="log-badge lb-n"><i className="fa-solid fa-bookmark"/> Note</span>,
  }
  return (
    <div className={`clog${open?'':' closed'}`}>
      <div className="cl-head">
        <div className="cl-hi"><i className="fa-solid fa-book-open-cover"/></div>
        <div><div className="cl-ht">Captain's Log</div><div className="cl-hd">{fmtDate()}</div></div>
        <button style={{marginLeft:'auto',color:'var(--t4)',cursor:'pointer',fontSize:'12px',padding:'2px',border:'none',background:'none',transition:'color .14s'}} onClick={onClose}><i className="fa-solid fa-xmark"/></button>
      </div>
      <div className="cl-body">
        {entries.map(e => (
          <div key={e.id} className={`log-entry ${e.entry_type}`}>
            <div className="log-meta">{badgeMap[e.entry_type]||null}<span>{fmt(e.created_at)}</span></div>
            <div className="log-text">{e.content}</div>
          </div>
        ))}
      </div>
      <div className="cl-foot">
        <textarea className="cl-ta" value={text} onChange={e=>setText(e.target.value)} placeholder="Log a thought, decision, or blocker…" rows={3}/>
        <div className="cl-btns">
          <button className="cl-b cl-save" onClick={()=>{ if(text.trim()){onSave(text.trim());setText('')} }}><i className="fa-solid fa-bookmark"/> Log it</button>
          <button className="cl-b cl-voice" onClick={onVoice}><i className="fa-solid fa-microphone"/> Voice</button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  MODALS
// ════════════════════════════════════════════════════════
function Modal({ onClose, icon, iconBg, iconColor, title, sub, children, footer, width=520 }) {
  useEffect(() => {
    const fn = e => { if(e.key==='Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])
  return (
    <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="modal" style={{width}}>
        <div className="modal-head">
          <div className="modal-ico" style={{background:iconBg}}><i className={`fa-solid ${icon}`} style={{color:iconColor}}/></div>
          <div><div className="modal-title">{title}</div><div className="modal-sub">{sub}</div></div>
          <button className="modal-close" onClick={onClose}><i className="fa-solid fa-xmark"/></button>
        </div>
        <div className="modal-body" style={{maxHeight:'65vh',overflowY:'auto'}}>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

function AddModal({ onClose, onSubmit, customFields }) {
  const [d, setD] = useState({ title:'', type:'task', priority:'medium', pts:'3', assignee:'RK', col:'backlog', desc:'' })
  const aColors = { RK:'#6366f1', SK:'#8b5cf6', AM:'#059669', PP:'#f59e0b' }
  return (
    <Modal onClose={onClose} icon="fa-mountain" iconBg="var(--golds)" iconColor="var(--gold)" title="Summit Item" sub="Add new work to Sprint 14"
      footer={<><button className="btn-g" onClick={onClose}>Cancel</button><button className="btn-p" onClick={()=>{ if(d.title.trim()) onSubmit({...d, assigneeColor:aColors[d.assignee]}); }}><i className="fa-solid fa-mountain"/> Summit It</button></>}>
      <div className="form-stack">
        <div><label className="form-label">Title</label><input className="form-input" value={d.title} onChange={e=>setD({...d,title:e.target.value})} placeholder="What needs to be climbed?"/></div>
        <div className="form-row">
          <div><label className="form-label">Type</label><select className="form-select" value={d.type} onChange={e=>setD({...d,type:e.target.value})}><option value="epic">◈ Epic</option><option value="story">◎ Story</option><option value="task">✓ Task</option><option value="bug">⚠ Bug</option></select></div>
          <div><label className="form-label">Priority</label><select className="form-select" value={d.priority} onChange={e=>setD({...d,priority:e.target.value})}><option value="critical">🔴 Critical</option><option value="high">🟠 High</option><option value="medium">🟡 Medium</option><option value="low">🟢 Low</option></select></div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Points</label><input className="form-input" type="number" value={d.pts} onChange={e=>setD({...d,pts:e.target.value})} min="1" max="100"/></div>
          <div><label className="form-label">Assignee</label><select className="form-select" value={d.assignee} onChange={e=>setD({...d,assignee:e.target.value})}><option value="RK">Raj Kumar</option><option value="SK">Sara Kim</option><option value="AM">Aman Mehta</option><option value="PP">Priya Patel</option></select></div>
        </div>
        <div><label className="form-label">Column</label><select className="form-select" value={d.col} onChange={e=>setD({...d,col:e.target.value})}><option value="backlog">Base Camp</option><option value="summit">Summit Ready</option><option value="ascent">In Ascent</option><option value="basecamp">At Base Camp</option><option value="peak">Peak Reached</option></select></div>
        <div><label className="form-label">Description</label><textarea className="form-textarea" value={d.desc} onChange={e=>setD({...d,desc:e.target.value})} placeholder="Describe the challenge…" rows={3}/></div>
        {customFields.length > 0 && customFields.map(f => (
          <div key={f.id}><label className="form-label">{f.name}</label><input className="form-input" placeholder={`Enter ${f.name}…`}/></div>
        ))}
      </div>
    </Modal>
  )
}

function VoiceModal({ recording, transcript, voiceType, onToggle, onSetType, onCreate, onClose }) {
  return (
    <Modal onClose={onClose} icon="fa-microphone" iconBg="var(--roses)" iconColor="var(--rose)" title="Voice Log" sub="Speak — Meridian transcribes and creates items" width={400}
      footer={<><button className="btn-g" onClick={onClose}>Cancel</button><button className="btn-p" onClick={onCreate}><i className="fa-solid fa-wand-magic-sparkles"/> Create with AI</button></>}>
      <div className={`vorb${recording?' rec':''}`} onClick={onToggle}>{recording?'⏹':'🎙'}</div>
      <div className="vbox" style={!transcript||transcript.startsWith('Click')?{fontStyle:'italic',color:'var(--t3)'}:{}}>{transcript||'Click the orb to begin recording…'}</div>
      <div className="vtyps">
        {[{id:'note',icon:'fa-bookmark',label:'Log Note'},{id:'story',icon:'fa-circle-dot',label:'Create Story'},{id:'task',icon:'fa-circle-check',label:'Create Task'}].map(t=>(
          <div key={t.id} className={`vty${voiceType===t.id?' sel':''}`} onClick={()=>onSetType(t.id)}>
            <i className={`fa-solid ${t.icon}`} style={{display:'block',marginBottom:'4px',fontSize:'16px'}}/>{t.label}
          </div>
        ))}
      </div>
    </Modal>
  )
}

function ColModal({ colVis, onToggle, onClose, customFields, onAddField }) {
  const cols = [
    { key:'Title', icon:'fa-heading' },{ key:'Type', icon:'fa-tag' },{ key:'Status', icon:'fa-circle-half-stroke' },
    { key:'Priority', icon:'fa-flag' },{ key:'Points', icon:'fa-fire-flame-curved' },
    { key:'Assignee', icon:'fa-user' },{ key:'Due Date', icon:'fa-calendar' },
    { key:'Sprint', icon:'fa-mountain-sun' },{ key:'Labels', icon:'fa-tag' },
  ]
  return (
    <Modal onClose={onClose} icon="fa-table-columns" iconBg="var(--skys)" iconColor="var(--sky)" title="Column Manager" sub="Toggle columns visible in Manifest" width={360}
      footer={<button className="btn-p" onClick={onClose}><i className="fa-solid fa-check"/> Done</button>}>
      <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
        {cols.map(c => (
          <div key={c.key} className="tog-row">
            <i className={`fa-solid ${c.icon}`}/> {c.key}
            <button className={`toggle${colVis[c.key]?' on':' off'}`} onClick={()=>onToggle(c.key)}/>
          </div>
        ))}
        {customFields.map(f => (
          <div key={f.id} className="tog-row">
            <i className="fa-solid fa-sparkles" style={{color:'var(--gold)'}}/> {f.name} <span style={{fontSize:'9px',color:'var(--gold)',marginLeft:'4px'}}>custom</span>
            <button className="toggle on" onClick={()=>{}}/>
          </div>
        ))}
        <button className="add-field-btn" onClick={onAddField}><i className="fa-solid fa-plus"/> Add Custom Field</button>
      </div>
    </Modal>
  )
}

function CFModal({ target, cfType, onSetType, onClose, onSave }) {
  const [name, setName] = useState('')
  const types = [
    {id:'text',icon:'fa-font'},{id:'number',icon:'fa-hashtag'},{id:'date',icon:'fa-calendar'},
    {id:'select',icon:'fa-list'},{id:'checkbox',icon:'fa-square-check'},{id:'url',icon:'fa-link'},
  ]
  const targetLabel = { item:'Summit Items', project:'Campaigns', sprint:'Expeditions' }[target] || target
  return (
    <Modal onClose={onClose} icon="fa-sparkles" iconBg="var(--golds)" iconColor="var(--gold)" title="Add Custom Field" sub={`Adding to: ${targetLabel}`} width={420}
      footer={<><button className="btn-g" onClick={onClose}>Cancel</button><button className="btn-p" onClick={()=>{ if(name.trim()) onSave(name.trim(), cfType) }}><i className="fa-solid fa-check"/> Add Field</button></>}>
      <div className="form-stack">
        <div><label className="form-label">Field Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Client Name, Budget, Phase…"/></div>
        <div>
          <label className="form-label">Field Type</label>
          <div className="cf-grid">
            {types.map(t=>(
              <div key={t.id} className={`cf-type${cfType===t.id?' sel':''}`} onClick={()=>onSetType(t.id)}>
                <i className={`fa-solid ${t.icon}`}/>{t.id}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
