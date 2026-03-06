import { useState, useEffect, useCallback, useRef } from 'react'
import { get, post, patch, del, postForm } from './api.js'

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
const TOASTS  = ['Saved.','Done!','Updated.','Created.','All set.']

// ── LS HELPERS ────────────────────────────────────────────
const LSGet = (k, d) => { try { return JSON.parse(localStorage.getItem('mer_'+k)) ?? d } catch{ return d } }
const LSSet = (k, v)  => localStorage.setItem('mer_'+k, JSON.stringify(v))

// ── HELPERS ───────────────────────────────────────────────
const fmt = d => new Date(d).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
const fmtDate = () => new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })

export default function App() {
  // ── STATE ─────────────────────────────────────────────
  const [view,      setViewState]  = useState(() => LSGet('view','board'))
  const [workspaces, setWorkspaces] = useState([])
  const [selWorkspaceId, setSelWorkspaceId] = useState(() => LSGet('selWorkspaceId', null))
  const [projects,  setProjects]   = useState([])
  const [sprints,   setSprints]    = useState([])
  const [selProjId, setSelProjId]   = useState(() => LSGet('selProjId', null))
  const [selSprintId, setSelSprintId] = useState(() => LSGet('selSprintId', null))
  const [items,     setItems]      = useState([])
  const [cols,      setCols]       = useState([])
  const [logItems,  setLog]        = useState([])
  const [crew,      setCrew]       = useState([])
  const [colVis,    setColVis]     = useState(() => LSGet('colVis', { Title:true, Type:true, Status:true, Priority:true, Points:true, Assignee:true, 'Due Date':true, Sprint:false, Labels:false }))
  const [customFields, setCF]      = useState(() => LSGet('customFields', { item:[], project:[], sprint:[] }))
  const [workspaceId, setWorkspaceId] = useState(null)
  const [logOpen,   setLogOpen]    = useState(() => LSGet('logOpen', true))
  const [toast,     setToastState] = useState({ show:false, emoji:'🎉', title:'', sub:'' })
  const [modal,     setModal]      = useState(null)  // 'add'|'voice'|'col'|'cf'|null
  const [cfTarget,  setCFTarget]   = useState('item')
  const [cfType,    setCFType]     = useState('text')
  const [recording, setRecording]  = useState(false)
  const [transcript,setTranscript] = useState('')
  const [voiceType, setVoiceType]  = useState('note')
  const [voiceError, setVoiceError] = useState('')
  const [apiReachable, setApiReachable] = useState(null) // null = unknown, true/false after first check
  const [apiUrlInput, setApiUrlInput] = useState('')
  const [adminSec,  setAdminSec]   = useState(null)
  const [trackerTab, setTrackerTab]= useState('bigrock')
  const mediaRecRef = useRef(null)
  const chunksRef = useRef([])

  const setView = (v) => { setViewState(v); LSSet('view', v) }
  const selProject = projects.find(p => p.id === selProjId) || projects[0]
  const selSprint = sprints.find(s => s.id === selSprintId) || sprints[0]

  // ── PERSIST ───────────────────────────────────────────
  useEffect(() => { LSSet('colVis', colVis) }, [colVis])
  useEffect(() => { LSSet('customFields', customFields) }, [customFields])
  useEffect(() => { LSSet('logOpen', logOpen) }, [logOpen])
  useEffect(() => { LSSet('items', items) }, [items])
  useEffect(() => { if (selProjId) LSSet('selProjId', selProjId) }, [selProjId])
  useEffect(() => { if (selSprintId) LSSet('selSprintId', selSprintId) }, [selSprintId])
  useEffect(() => { if (selWorkspaceId) LSSet('selWorkspaceId', selWorkspaceId) }, [selWorkspaceId])

  // ── LOAD: ensure schema → workspaces → projects (by workspace) ─────────
  const refreshWorkspaces = useCallback(() => {
    get('/api/workspaces').then(data => {
      if (Array.isArray(data)) {
        setWorkspaces(data)
        if (data.length && !data.some(w => w.id === selWorkspaceId)) setSelWorkspaceId(data[0].id)
      }
    }).catch(() => {})
  }, [selWorkspaceId])
  const retryApiConnection = useCallback(() => {
    setApiReachable(null)
    get('/api/workspaces').then(data => {
      setApiReachable(true)
      if (Array.isArray(data)) {
        setWorkspaces(data)
        const cur = LSGet('selWorkspaceId', null)
        if (data.length && (!cur || !data.some(w => w.id === cur))) setSelWorkspaceId(data[0].id)
        else if (cur) setSelWorkspaceId(cur)
      }
    }).catch(() => setApiReachable(false))
  }, [])
  const refreshProjects = useCallback(() => {
    if (!selWorkspaceId) { setProjects([]); return }
    get(`/api/projects?workspace_id=${selWorkspaceId}`).then(data => {
      if (Array.isArray(data)) setProjects(data)
    }).catch(() => setProjects([]))
  }, [selWorkspaceId])
  useEffect(() => {
    let cancelled = false
    const loadWorkspaces = (retry = false) => {
      get('/api/db/ensure').catch(() => {}).finally(() => {
        if (cancelled) return
        get('/api/workspaces').then(data => {
          if (cancelled) return
          setApiReachable(true)
          if (Array.isArray(data)) {
            setWorkspaces(data)
            const cur = LSGet('selWorkspaceId', null)
            if (data.length && (!cur || !data.some(w => w.id === cur))) setSelWorkspaceId(data[0].id)
            else if (cur) setSelWorkspaceId(cur)
          }
        }).catch(() => {
          if (cancelled) return
          if (!retry) setTimeout(() => loadWorkspaces(true), 1500)
          else setApiReachable(false)
        })
      })
    }
    loadWorkspaces()
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    if (!selWorkspaceId) { setProjects([]); setSprints([]); setSelProjId(null); setSelSprintId(null); return }
    get(`/api/projects?workspace_id=${selWorkspaceId}`).then(data => {
      if (Array.isArray(data) && data.length) {
        setProjects(data)
        if (!selProjId || !data.some(p => p.id === selProjId)) setSelProjId(data[0].id)
      } else { setProjects([]); setSelProjId(null); setSelSprintId(null); setSprints([]) }
    }).catch(() => { setProjects([]); setSelProjId(null) })
  }, [selWorkspaceId])
  const refreshSprints = useCallback(() => {
    if (!selProjId) return
    get(`/api/sprints?project_id=${selProjId}`).then(data => {
      if (Array.isArray(data)) setSprints(data)
    }).catch(()=>{})
  }, [selProjId])
  useEffect(() => {
    if (!selProjId) { setSprints([]); return }
    get(`/api/sprints?project_id=${selProjId}`).then(data => {
      if (Array.isArray(data) && data.length) {
        setSprints(data)
        if (!selSprintId || !data.some(s => s.id === selSprintId)) setSelSprintId(data[0].id)
      } else setSprints([])
    }).catch(()=>{})
  }, [selProjId])
  useEffect(() => {
    if (!selProjId) { setCols([]); setItems([]); setLog([]); return }
    get(`/api/columns?project_id=${selProjId}`).then(data => { setCols(Array.isArray(data) ? data : []) }).catch(()=>setCols([]))
    get(`/api/log?project_id=${selProjId}`).then(data => { setLog(Array.isArray(data) ? data : []) }).catch(()=>setLog([]))
  }, [selProjId])
  useEffect(() => {
    if (!selSprintId) { setItems([]); return }
    get(`/api/items?sprint_id=${selSprintId}`).then(data => { setItems(Array.isArray(data) ? data : []) }).catch(()=>setItems([]))
  }, [selSprintId])
  useEffect(() => {
    get('/api/crew').then(data => { if(Array.isArray(data) && data.length) setCrew(data) }).catch(()=>{})
  }, [])
  useEffect(() => {
    const wid = selProject?.workspace_id
    if (!wid) return
    get(`/api/custom-fields?workspace_id=${wid}`).then(data => {
      if (Array.isArray(data) && data.length) {
        const cf = { item:[], project:[], sprint:[] }
        data.forEach(f => { if (cf[f.target]) cf[f.target].push(f) })
        setCF(cf)
      }
    }).catch(()=>{})
  }, [selProjId, selProject?.workspace_id])

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
    if (!selProjId || !selSprintId) {
      showToast('⚠️', 'Select a project and sprint', 'Pick one from the sidebar first.')
      return
    }
    const colSlug = data.col || 'backlog'
    const col = cols.find(c => c.slug === colSlug)
    const newItem = {
      id: 'local-' + Date.now(),
      title: data.title,
      type: data.type || 'task',
      priority: data.priority || 'medium',
      points: parseInt(data.pts || data.points, 10) || 3,
      status: colSlug,
      assignee_initials: data.assignee || '',
      assignee_color: data.assigneeColor || '#6366f1',
      description: data.description || '',
    }
    setItems(prev => [...prev, newItem])
    showToast('⛰️', 'Item added!', `"${data.title.slice(0,35)}…" added`)
    try {
      const saved = await post('/api/items', {
        project_id: selProjId,
        sprint_id: selSprintId,
        column_id: col?.id || null,
        title: data.title,
        type: data.type || 'task',
        priority: data.priority || 'medium',
        points: parseInt(data.pts || data.points, 10) || 3,
        status: colSlug,
        description: data.description || '',
      })
      setItems(prev => prev.map(i => i.id === newItem.id ? { ...saved, assignee_initials: newItem.assignee_initials, assignee_color: newItem.assignee_color } : i))
    } catch (e) {
      showToast('⚠️', 'Could not save', e?.message || 'API error')
    }
  }

  const cycleItemStatus = async (id) => {
    const item = items.find(i => i.id === id)
    if (!item || !cols.length) return
    const idx  = cols.findIndex(c => c.slug === item.status)
    const next = cols[(idx + 1) % cols.length]
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: next.slug, column_id: next.id } : i))
    if (next.is_done) launchConfetti()
    try { await patch(`/api/items/${id}`, { status: next.slug, column_id: next.id }) } catch (_) {}
  }

  // ── LOG ───────────────────────────────────────────────
  const saveLogEntry = (text, type = 'note') => {
    const entry = { id: 'log-'+Date.now(), entry_type: type, content: text, created_at: new Date().toISOString() }
    setLog(prev => [entry, ...prev])
    showToast('📝', type==='voice'?'Voice note saved':'Note logged', "Saved to Captain's Log")
    post('/api/log', { project_id: selProjId || undefined, sprint_id: selSprintId || undefined, entry_type: type, content: text }).catch(e => showToast('⚠️', 'Could not save note', e?.message || ''))
  }

  // ── VOICE: real recording + transcribe API ─────────────
  const toggleRec = async () => {
    if (recording) {
      if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
        mediaRecRef.current.stop()
      }
      setRecording(false)
      return
    }
    setVoiceError('')
    setTranscript('Listening…')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (chunksRef.current.length === 0) { setTranscript('No audio captured'); return }
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setTranscript('Transcribing…')
        try {
          const form = new FormData()
          form.append('audio', blob, 'voice.webm')
          const { transcript: text } = await postForm('/api/voice/transcribe', form)
          setTranscript(text || '(no text)')
        } catch (e) {
          setVoiceError(e?.message || 'Transcription failed')
          setTranscript('')
        }
      }
      rec.start()
      mediaRecRef.current = rec
      setRecording(true)
    } catch (e) {
      setVoiceError(e?.message || 'Microphone access denied')
      setTranscript('')
    }
  }

  const createFromVoice = async () => {
    const t = (transcript || '').trim()
    if (!t || t.startsWith('Listening') || t.startsWith('Click') || t === 'Transcribing…') {
      setVoiceError('Record and transcribe first')
      return
    }
    setVoiceError('')
    if (voiceType === 'note') {
      saveLogEntry(t, 'voice')
      setModal(null)
      setTranscript('')
      return
    }
    if (!selProjId || !selSprintId) {
      setVoiceError('Select a project and sprint to create a task')
      showToast('⚠️', 'Select project & sprint', 'Choose them from the sidebar first.')
      return
    }
    try {
      const result = await post('/api/voice/create', {
        transcript: t,
        item_type: voiceType,
        project_id: selProjId,
        sprint_id: selSprintId,
      })
      if (result.type === 'item' && result.item) {
        setItems(prev => [...prev, { ...result.item, assignee_initials: '', assignee_color: '#6366f1' }])
        showToast('✅', 'Created', result.item.title?.slice(0, 40) + (result.item.title?.length > 40 ? '…' : ''))
      } else if (result.type === 'log' && result.entry) {
        setLog(prev => [{ ...result.entry, author_name: 'Voice' }, ...prev])
        showToast('📝', 'Note saved', "Saved to Captain's Log")
      }
      setModal(null)
      setTranscript('')
    } catch (e) {
      const msg = e?.message || 'Failed to create'
      setVoiceError(msg)
      showToast('⚠️', 'Error', msg)
    }
  }

  // ── CUSTOM FIELDS ─────────────────────────────────────
  const addCustomField = (name, type, target) => {
    const wid = selProject?.workspace_id
    if (!wid) { showToast('⚠️', 'Select a project first', 'Custom fields are saved per team.'); return }
    const field = { id:'cf-'+Date.now(), name, field_type: type, target }
    setCF(prev => ({ ...prev, [target]: [...(prev[target]||[]), field] }))
    post('/api/custom-fields', { name, field_type: type, target, workspace_id: wid }).catch(()=>{})
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
      {apiReachable === false && (
        <div className="api-banner" role="alert">
          <div className="api-banner-content">
            <p className="api-banner-msg">
              <strong>Cannot reach API.</strong>{' '}
              {typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location?.host || '')
                ? <>Open the app using your <strong>main app URL</strong> (e.g. <code>https://revops-ntkll.ondigitalocean.app</code>), or set the API URL below and click Save &amp; retry.</>
                : 'Start the backend: cd backend && npm run dev. Set DATABASE_URL in backend/.env.'}
            </p>
            {typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location?.host || '') && (
              <div className="api-banner-actions">
                <input
                  type="url"
                  className="api-banner-input"
                  placeholder="https://revops-ntkll.ondigitalocean.app"
                  value={apiUrlInput}
                  onChange={e => setApiUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.target.value.trim() ? (localStorage.setItem('meridian_api_base', e.target.value.trim().replace(/\/$/, '')), retryApiConnection(), setApiUrlInput('')) : retryApiConnection())}
                />
                <button type="button" className="api-banner-btn" onClick={() => {
                  if (apiUrlInput.trim()) {
                    localStorage.setItem('meridian_api_base', apiUrlInput.trim().replace(/\/$/, ''));
                    setApiUrlInput('');
                  }
                  retryApiConnection();
                }}>
                  {apiUrlInput.trim() ? 'Save & retry' : 'Retry'}
                </button>
              </div>
            )}
          </div>
          <button type="button" className="api-banner-dismiss" onClick={() => setApiReachable(null)} aria-label="Dismiss">×</button>
        </div>
      )}
      {/* ── TOPBAR ── */}
      <Topbar workspaces={workspaces} selWorkspaceId={selWorkspaceId} onSelectWorkspace={setSelWorkspaceId}
        onNewWorkspace={()=>setModal('newWorkspace')} onVoice={()=>setModal('voice')} onLog={()=>setLogOpen(v=>{LSSet('logOpen',!v);return !v})} />

      <div className="app-body">
        {/* ── SIDEBAR ── */}
        <Sidebar view={view} setView={setView} crew={crew} items={items}
          projects={projects} sprints={sprints} selProjId={selProjId} selSprintId={selSprintId}
          onSelectProject={setSelProjId} onSelectSprint={setSelSprintId}
          onNewProject={()=>setModal('newProject')} onNewSprint={()=>setModal('newSprint')} />

        {/* ── MAIN ── */}
        <div className="main-area">
          <div className="page-head">
            <div className="bc">
              <i className="fa-solid fa-house-chimney"></i>
              <span style={{color:'var(--t3)'}}>{selProject?.name || 'Meridian'}</span>
              {selSprint && (
                <>
                  <span className="bc-sep"> › </span>
                  <span style={{color:'var(--t2)'}}>{selSprint.name}</span>
                </>
              )}
            </div>
            <div className="pt-row">
              <div className="page-title">{selSprint?.name || selProject?.name || 'Select a project'}</div>
              {selSprint && <div className="s-tag"><div className="s-dot"></div> {selSprint.status || 'Active'}</div>}
            </div>
            <div className="pm">
              <div className="pmi"><i className="fa-regular fa-calendar"></i> Mar 1 – 14, 2026</div>
              <div className="pmi">
                <div className="prog-t"><div className="prog-f" style={{width:pct+'%'}}></div></div>
                {pct}% complete
              </div>
              <div className="pmi"><i className="fa-solid fa-bolt" style={{color:'var(--gold)'}}></i> <span style={{fontWeight:600}}>{totalPts}pt</span></div>
              <div className="pmi" style={{color:'var(--jade)'}}><i className="fa-solid fa-circle-check"></i> <span style={{fontWeight:600}}>{donePts}pt</span> done</div>
            </div>
          </div>

          {/* ── KPI SUMMARY CARDS ── */}
          {view !== 'admin' && (() => {
            const doneCount = cols.some(c => c.is_done) ? items.filter(i => cols.find(c => c.slug === i.status)?.is_done).length : 0
            const inProgress = items.length - doneCount
            const atRisk = items.filter(i => (i.priority === 'high' || i.priority === 'critical') && !cols.find(c => c.slug === i.status)?.is_done).length
            const progPct = items.length ? Math.round((doneCount / items.length) * 100) : 0
            return (
              <div className="kpi-grid">
                <div className="kpi-card solved">
                  <span className="kpi-title">Solved / Done</span>
                  <div className="kpi-val">{doneCount}</div>
                  <div className="kpi-ico"><i className="fa-solid fa-circle-check"/></div>
                  <div className="kpi-prog"><div className="kpi-prog-fill" style={{width: progPct + '%', background: 'var(--jade)'}}/></div>
                </div>
                <div className="kpi-card in-progress">
                  <span className="kpi-title">In Progress</span>
                  <div className="kpi-val">{inProgress}</div>
                  <div className="kpi-ico"><i className="fa-regular fa-clock"/></div>
                </div>
                <div className="kpi-card at-risk">
                  <span className="kpi-title">At Risk / Blocked</span>
                  <div className="kpi-val">{atRisk}</div>
                  <div className="kpi-ico"><i className="fa-solid fa-triangle-exclamation"/></div>
                </div>
                <div className="kpi-card big-rocks">
                  <span className="kpi-title">Items</span>
                  <div className="kpi-val">{items.length}</div>
                  <div className="kpi-ico"><i className="fa-solid fa-bullseye"/></div>
                </div>
              </div>
            )
          })()}

          {/* ── VIEW TABS ── */}
          <div className="vtabs">
            {views.map(v => (
              <button key={v.id} className={`vt${view===v.id?' active':''}`} onClick={()=>setView(v.id)}>
                <i className={`fa-solid ${v.icon}`}></i> {v.label}
              </button>
            ))}
            <div className="vt-acts">
              <button className="btn-g"><i className="fa-solid fa-file-export"></i> Export</button>
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
      {modal === 'voice' && <VoiceModal recording={recording} transcript={transcript} voiceType={voiceType} voiceError={voiceError}
        onToggle={toggleRec} onSetType={setVoiceType} onCreate={createFromVoice} onClose={()=>{ setModal(null); setVoiceError(''); if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') mediaRecRef.current.stop(); setRecording(false); setTranscript(''); }} />}
      {modal === 'col' && <ColModal colVis={colVis} onToggle={toggleCol} onClose={()=>setModal(null)}
        customFields={customFields.item} onAddField={()=>{ setModal('cf'); setCFTarget('item') }} />}
      {modal === 'cf' && <CFModal target={cfTarget} cfType={cfType} onSetType={setCFType}
        onClose={()=>setModal(null)}
        onSave={(name,type)=>{ addCustomField(name,type,cfTarget); setModal(null); showToast('✨','Field added!',`"${name}" added to ${cfTarget} fields`) }} />}
      {modal === 'newWorkspace' && <CreateWorkspaceModal onClose={()=>setModal(null)} onCreated={(id)=>{ refreshWorkspaces(); setSelWorkspaceId(id); setModal(null); showToast('✅','Team created','') }} />}
      {modal === 'newProject' && <CreateProjectModal workspaceId={selWorkspaceId} onClose={()=>setModal(null)} onCreated={(id)=>{ refreshProjects(); setSelProjId(id); setModal(null); showToast('✅','Project created','') }} />}
      {modal === 'newSprint' && <CreateSprintModal projectId={selProjId} onClose={()=>setModal(null)} onCreated={(id)=>{ refreshSprints(); setSelSprintId(id); setModal(null); showToast('✅','Sprint created','') }} />}

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
function Topbar({ workspaces = [], selWorkspaceId, onSelectWorkspace, onNewWorkspace, onVoice, onLog }) {
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
      {workspaces.map(w => (
        <button key={w.id} className={`ws-btn${selWorkspaceId===w.id?' active':''}`} onClick={()=>onSelectWorkspace?.(w.id)} title={w.name}>
          <span style={{fontSize:'10px',opacity:0.9}}>{w.icon || '⚡'}</span>
          <span style={{maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.name}</span>
        </button>
      ))}
      <button className="ws-btn" onClick={onNewWorkspace} title="New team" style={{color:'rgba(255,255,255,.8)'}}><i className="fa-solid fa-plus" style={{fontSize:10}}/> New team</button>
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
function Sidebar({ view, setView, crew, items, projects = [], sprints = [], selProjId, selSprintId, onSelectProject, onSelectSprint, onNewProject, onNewSprint }) {
  const navItems = [
    { id:'board',   label:'Summit Board',   icon:'fa-chart-kanban',  cnt: items.length },
    { id:'list',    label:'Manifest',       icon:'fa-list-ul'        },
    { id:'gantt',   label:'Expedition Map', icon:'fa-bars-progress'  },
    { id:'tracker', label:'Field Notes',    icon:'fa-table-cells',   cnt: 3 },
    { id:'metrics', label:'Observatory',    icon:'fa-chart-area'     },
    { id:'admin',   label:'Base Camp',      icon:'fa-sliders',       special:'Admin' },
  ]
  const statusColor = { online:'var(--jade)', away:'var(--sun)', offline:'var(--t4)' }
  const colors = ['#6366f1','#8b5cf6','#059669','#f59e0b','#3d9be9']
  const projectSprints = sprints.filter(s => s.project_id === selProjId)
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
        <div className="sb-lbl">Projects</div>
        {projects.length === 0 ? <div style={{fontSize:'12px',color:'var(--t4)',padding:'8px 12px'}}>No projects yet</div> : null}
        {projects.map((p, i) => (
          <div key={p.id} className={`si${selProjId===p.id?' active':''}`} onClick={()=>onSelectProject?.(p.id)}>
            <span className="si-ico" style={{color:p.color||colors[i%colors.length],fontSize:'10px'}}>●</span> {p.name}
          </div>
        ))}
        <div className="sb-add" onClick={onNewProject} role="button"><i className="fa-solid fa-plus" style={{fontSize:'10px'}}/> New project</div>
      </div>
      <div className="sb-div"/>
      <div className="sb-sect">
        <div className="sb-lbl">Sprints</div>
        {projectSprints.length === 0 && selProjId ? <div style={{fontSize:'12px',color:'var(--t4)',padding:'8px 12px'}}>No sprints yet</div> : null}
        {projectSprints.map(s => (
          <div key={s.id} className={`si${selSprintId===s.id?' active':''}`} onClick={()=>onSelectSprint?.(s.id)}>
            <i className="fa-solid fa-mountain-sun si-ico"/>{s.name} <span className="sb-cnt">{items.length}</span>
          </div>
        ))}
        <div className="sb-add" onClick={onNewSprint} role="button"><i className="fa-solid fa-plus" style={{fontSize:'10px'}}/> New sprint</div>
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
    { key:'Points',   render: i => <td key="pts" style={{fontWeight:600,fontSize:'13px'}}>{i.points||0}pt</td> },
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
              {customFields.map(f => <td key={f.id}><input style={{background:'transparent',border:'none',color:'var(--t2)',fontSize:'13px',width:'100%',outline:'none'}} placeholder="—"/></td>)}
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
                <td style={{fontWeight:600,fontSize:'12px'}}>{item.points}pt</td>
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
          <button className="btn-p" style={{fontSize:'12px',padding:'8px 14px'}}><i className="fa-solid fa-plus"/> Add Row</button>
        </div>
      </div>
      <div className="tracker-search-wrap">
        <i className="fa-solid fa-magnifying-glass tracker-search-ico"/>
        <input type="text" className="tracker-search" placeholder="Search initiatives…" />
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
                <td style={{fontSize:'11px',color:'var(--t3)'}}><input style={{background:'transparent',border:'none',color:'var(--t2)',fontSize:'12px',outline:'none',width:'100%'}} defaultValue="See tracker…"/></td>
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
              <div style={{fontSize:'12px',fontWeight:600,color:'var(--t3)',width:'55px',textAlign:'right'}}>{cdone}/{assigned}pt</div>
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
            <div style={{fontSize:'18px',fontWeight:700,color:'var(--t1)'}}>{sec.title}</div>
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
        <div style={{fontSize:'18px',fontWeight:700,color:'var(--t1)',marginBottom:'16px'}}>Board Columns</div>
        {['Base Camp','Summit Ready','In Ascent','At Base Camp','Peak Reached'].map((n,i)=>(
          <div key={i} className="field-item">
            <div style={{width:'14px',height:'14px',borderRadius:'50%',background:Object.values(COL_COLORS)[i],flexShrink:0}}/>
            <input defaultValue={n} style={{flex:1,background:'transparent',border:'none',outline:'none',fontSize:'13px',fontWeight:500,color:'var(--t1)'}}/>
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
        <div style={{fontSize:'18px',fontWeight:700,color:'var(--t1)',marginBottom:'16px'}}>Crew Management</div>
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
        <div style={{fontSize:'18px',fontWeight:700,color:'var(--t1)',marginBottom:'16px'}}>Integrations</div>
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
        <div style={{fontSize:'22px',fontWeight:700,color:'var(--t1)',marginBottom:'5px'}}>Base Camp — Admin Center</div>
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
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{width}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-ico" style={{background:iconBg}}><i className={`fa-solid ${icon}`} style={{color:iconColor}}/></div>
          <div><div className="modal-title">{title}</div><div className="modal-sub">{sub}</div></div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><i className="fa-solid fa-xmark"/></button>
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
      footer={<><button type="button" className="btn-g" onClick={onClose}>Cancel</button><button type="button" className="btn-p" onClick={()=>{ if(d.title.trim()) onSubmit({...d, assigneeColor:aColors[d.assignee]}); }}><i className="fa-solid fa-mountain"/> Summit It</button></>}>
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

function VoiceModal({ recording, transcript, voiceType, voiceError, onToggle, onSetType, onCreate, onClose }) {
  return (
    <Modal onClose={onClose} icon="fa-microphone" iconBg="var(--roses)" iconColor="var(--rose)" title="Voice" sub="Record to transcribe; create a note or task" width={400}
      footer={<><button type="button" className="btn-g" onClick={onClose}>Cancel</button><button type="button" className="btn-p" onClick={onCreate}><i className="fa-solid fa-wand-magic-sparkles"/> Save / Create</button></>}>
      <div className={`vorb${recording?' rec':''}`} onClick={onToggle}>{recording?'⏹':'🎙'}</div>
      {voiceError && <div className="form-err" style={{marginBottom:8}}>{voiceError}</div>}
      <div className="vbox" style={!transcript||transcript.startsWith('Click')?{fontStyle:'italic',color:'var(--t3)'}:{}}>{transcript||'Click the mic to record. Speak clearly, then click stop.'}</div>
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
      footer={<button type="button" className="btn-p" onClick={onClose}><i className="fa-solid fa-check"/> Done</button>}>
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
      footer={<><button type="button" className="btn-g" onClick={onClose}>Cancel</button><button type="button" className="btn-p" onClick={()=>{ if(name.trim()) onSave(name.trim(), cfType) }}><i className="fa-solid fa-check"/> Add Field</button></>}>
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

function CreateProjectModal({ workspaceId, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [err, setErr] = useState('')
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!name.trim()) { setErr('Project name is required'); return }
    if (!workspaceId) { setErr('Select a team first (use the top bar).'); return }
    try {
      const created = await post('/api/projects', { workspace_id: workspaceId, name: name.trim(), description: desc.trim() })
      onCreated(created.id)
    } catch (e) {
      setErr(e?.message || 'Failed to create project')
    }
  }
  return (
    <Modal onClose={onClose} icon="fa-diagram-project" iconBg="var(--skys)" iconColor="var(--sky)" title="New Project" sub="Create a project in the current team" width={420}
      footer={<><button type="button" className="btn-g" onClick={onClose}>Cancel</button><button type="button" className="btn-p" onClick={handleSubmit}><i className="fa-solid fa-plus"/> Create</button></>}>
      <div className="form-stack">
        {err && <div className="form-err">{err}</div>}
        <div><label className="form-label">Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Project name"/></div>
        <div><label className="form-label">Description</label><textarea className="form-input" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Optional" rows={2}/></div>
      </div>
    </Modal>
  )
}

function CreateSprintModal({ projectId, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [err, setErr] = useState('')
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!name.trim()) { setErr('Sprint name is required'); return }
    if (!projectId) { setErr('Select a project first'); return }
    try {
      const created = await post('/api/sprints', { project_id: projectId, name: name.trim(), goal: goal.trim() })
      onCreated(created.id)
    } catch (e) {
      setErr(e?.message || 'Failed to create sprint')
    }
  }
  return (
    <Modal onClose={onClose} icon="fa-mountain-sun" iconBg="var(--jades)" iconColor="var(--jade)" title="New Sprint" sub="Create a sprint in the current project" width={420}
      footer={<><button type="button" className="btn-g" onClick={onClose}>Cancel</button><button type="button" className="btn-p" onClick={handleSubmit}><i className="fa-solid fa-plus"/> Create</button></>}>
      <div className="form-stack">
        {err && <div className="form-err">{err}</div>}
        <div><label className="form-label">Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sprint 1"/></div>
        <div><label className="form-label">Goal</label><textarea className="form-input" value={goal} onChange={e=>setGoal(e.target.value)} placeholder="Optional" rows={2}/></div>
      </div>
    </Modal>
  )
}

function CreateWorkspaceModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!name.trim()) { setErr('Team name is required'); return }
    try {
      const created = await post('/api/workspaces', { name: name.trim() })
      onCreated(created.id)
    } catch (e) {
      setErr(e?.message || 'Failed to create team')
    }
  }
  return (
    <Modal onClose={onClose} icon="fa-users" iconBg="var(--lavs)" iconColor="var(--lav)" title="New Team" sub="Create a team (workspace) to hold projects" width={400}
      footer={<><button type="button" className="btn-g" onClick={onClose}>Cancel</button><button type="button" className="btn-p" onClick={handleSubmit}><i className="fa-solid fa-plus"/> Create</button></>}>
      <div className="form-stack">
        {err && <div className="form-err">{err}</div>}
        <div><label className="form-label">Team name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. RevOps, Engineering"/></div>
      </div>
    </Modal>
  )
}
