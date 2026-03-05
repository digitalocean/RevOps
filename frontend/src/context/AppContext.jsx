import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '';

function getApiBase() {
  // Dev with proxy: use same origin so /api goes to Vite proxy
  if (import.meta.env.DEV && !API) return '';
  // Build-time env set (e.g. DigitalOcean): use it
  if (API) return String(API).replace(/\/$/, '');
  // Production fallback: same origin (works when app and API share one domain)
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

const initialState = {
  workspaces: [],
  projects: [],
  sprints: [],
  items: [],
  team: [],
  trackers: [],
  trackerRows: {},
  logEntries: [],
  selectedWorkspaceId: null,
  selectedProjectId: null,
  selectedSprintId: null,
  selectedView: 'war-room',
  captainsLogOpen: true,
  currentUser: { name: 'Captain', avatar: 'RK', color: '#6366f1' },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_WORKSPACES': return { ...state, workspaces: action.payload };
    case 'SET_PROJECTS': return { ...state, projects: action.payload };
    case 'SET_SPRINTS': return { ...state, sprints: action.payload };
    case 'SET_ITEMS': return { ...state, items: action.payload };
    case 'SET_TEAM': return { ...state, team: action.payload };
    case 'SET_TRACKERS': return { ...state, trackers: action.payload };
    case 'SET_TRACKER_ROWS': return { ...state, trackerRows: { ...state.trackerRows, [action.trackerId]: action.payload } };
    case 'SET_LOG_ENTRIES': return { ...state, logEntries: action.payload };
    case 'SET_SELECTED_WORKSPACE': return { ...state, selectedWorkspaceId: action.payload };
    case 'SET_SELECTED_PROJECT': return { ...state, selectedProjectId: action.payload };
    case 'SET_SELECTED_SPRINT': return { ...state, selectedSprintId: action.payload };
    case 'SET_VIEW': return { ...state, selectedView: action.payload };
    case 'TOGGLE_CAPTAINS_LOG': return { ...state, captainsLogOpen: !state.captainsLogOpen };
    case 'SET_CAPTAINS_LOG': return { ...state, captainsLogOpen: action.payload };
    case 'ADD_ITEM': return { ...state, items: [...state.items, action.payload] };
    case 'UPDATE_ITEM': return { ...state, items: state.items.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'REMOVE_ITEM': return { ...state, items: state.items.filter(i => i.id !== action.payload) };
    case 'ADD_LOG_ENTRY': return { ...state, logEntries: [action.payload, ...state.logEntries] };
    default: return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const base = getApiBase();

  const fetchJson = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${base}/api${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...opts.headers } });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, [base]);

  const refreshProjects = useCallback(async () => {
    try {
      const data = await fetchJson('/projects');
      dispatch({ type: 'SET_PROJECTS', payload: data });
    } catch (e) { console.error(e); }
  }, [fetchJson]);

  const refreshSprints = useCallback(async () => {
    if (!state.selectedProjectId) return dispatch({ type: 'SET_SPRINTS', payload: [] });
    try {
      const data = await fetchJson(`/projects/${state.selectedProjectId}/sprints`);
      dispatch({ type: 'SET_SPRINTS', payload: data });
    } catch (e) { console.error(e); }
    return [];
  }, [fetchJson, state.selectedProjectId]);

  const refreshItems = useCallback(async () => {
    if (!state.selectedSprintId) return dispatch({ type: 'SET_ITEMS', payload: [] });
    try {
      const data = await fetchJson(`/sprints/${state.selectedSprintId}/items`);
      dispatch({ type: 'SET_ITEMS', payload: data });
    } catch (e) { console.error(e); }
  }, [fetchJson, state.selectedSprintId]);

  const refreshTeam = useCallback(async () => {
    try {
      const data = await fetchJson('/team');
      dispatch({ type: 'SET_TEAM', payload: data });
    } catch (e) { console.error(e); }
  }, [fetchJson]);

  const refreshLog = useCallback(async () => {
    if (!state.selectedSprintId) return dispatch({ type: 'SET_LOG_ENTRIES', payload: [] });
    try {
      const data = await fetchJson(`/sprints/${state.selectedSprintId}/log`);
      dispatch({ type: 'SET_LOG_ENTRIES', payload: data });
    } catch (e) { console.error(e); }
  }, [fetchJson, state.selectedSprintId]);

  const refreshWorkspaces = useCallback(async () => {
    try {
      const data = await fetchJson('/workspaces');
      dispatch({ type: 'SET_WORKSPACES', payload: data });
    } catch (e) { console.error(e); }
  }, [fetchJson]);

  useEffect(() => { refreshWorkspaces(); refreshProjects(); refreshTeam(); }, [refreshWorkspaces, refreshProjects, refreshTeam]);
  useEffect(() => { refreshSprints(); }, [state.selectedProjectId, refreshSprints]);
  useEffect(() => { refreshItems(); }, [state.selectedSprintId, refreshItems]);
  useEffect(() => { refreshLog(); }, [state.selectedSprintId, refreshLog]);

  const value = {
    ...state,
    apiBase: base,
    fetchJson,
    refreshProjects,
    refreshSprints,
    refreshItems,
    refreshTeam,
    refreshLog,
    dispatch,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
