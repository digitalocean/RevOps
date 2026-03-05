import React, { useState, useCallback, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import PageHeader from './components/PageHeader';
import ViewTabs from './components/ViewTabs';
import CaptainLog from './components/CaptainLog';
import WarRoom from './views/WarRoom';
import Manifest from './views/Manifest';
import VoyagePlan from './views/VoyagePlan';
import Trackers from './views/Trackers';
import Compass from './views/Compass';
import VoiceModal from './components/VoiceModal';
import ColumnModal from './components/ColumnModal';
import AddItemModal from './components/AddItemModal';

function Layout() {
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [columnOpen, setColumnOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemDefaultStatus, setAddItemDefaultStatus] = useState('backlog');
  const [selectedItem, setSelectedItem] = useState(null);
  const { selectedView, captainsLogOpen, dispatch, fetchJson, refreshItems, refreshLog, selectedProjectId, selectedSprintId } = useApp();

  const openAddItem = useCallback((status) => {
    setAddItemDefaultStatus(status || 'backlog');
    setAddItemOpen(true);
  }, []);

  const handleVoiceSubmit = useCallback(
    async ({ transcript, type }) => {
      try {
        const body = { transcript, type, projectId: selectedProjectId, sprintId: selectedSprintId };
        const res = await fetchJson('/voice/create', { method: 'POST', body: JSON.stringify(body) });
        if (res.id && type === 'note') dispatch({ type: 'ADD_LOG_ENTRY', payload: res });
        else if (res.id) refreshItems();
        setVoiceOpen(false);
      } catch (e) {
        console.error(e);
      }
    },
    [fetchJson, selectedProjectId, selectedSprintId, dispatch, refreshItems]
  );

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_CAPTAINS_LOG' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  const renderView = () => {
    switch (selectedView) {
      case 'war-room':
        return <WarRoom onOpenItem={setSelectedItem} onAddItem={openAddItem} />;
      case 'manifest':
        return <Manifest onOpenItem={setSelectedItem} onAddItem={() => openAddItem()} />;
      case 'voyage-plan':
        return <VoyagePlan onOpenItem={setSelectedItem} />;
      case 'trackers':
        return <Trackers />;
      case 'compass':
        return <Compass />;
      default:
        return <WarRoom onOpenItem={setSelectedItem} onAddItem={openAddItem} />;
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--ink)' }}>
      <Topbar onVoiceClick={() => setVoiceOpen(true)} onColumnsClick={() => setColumnOpen(true)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          onNewProject={() => {}}
          onNewSprint={() => {}}
        />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <PageHeader />
          <ViewTabs
            onColumnsClick={() => setColumnOpen(true)}
            onAddItem={() => openAddItem()}
          />
          <div className="flex-1 overflow-hidden flex flex-col">{renderView()}</div>
        </main>
        {captainsLogOpen && (
          <CaptainLog
            open={captainsLogOpen}
            onClose={() => dispatch({ type: 'SET_CAPTAINS_LOG', payload: false })}
            onVoiceClick={() => setVoiceOpen(true)}
          />
        )}
      </div>

      <VoiceModal open={voiceOpen} onClose={() => setVoiceOpen(false)} onSubmit={handleVoiceSubmit} />
      <ColumnModal open={columnOpen} onClose={() => setColumnOpen(false)} />
      <AddItemModal open={addItemOpen} defaultStatus={addItemDefaultStatus} onClose={() => setAddItemOpen(false)} />

      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9990]"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="max-w-lg w-full rounded-[var(--r)] p-6 border border-[var(--border2)]"
            style={{ background: 'var(--ink2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-fraunces font-semibold text-xl mb-2" style={{ color: 'var(--white)' }}>{selectedItem.title}</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--mist)' }}>{selectedItem.description || 'No description.'}</p>
            <div className="flex gap-2 text-xs" style={{ color: 'var(--fog)' }}>
              <span>{selectedItem.type}</span>
              <span>{selectedItem.status}</span>
              <span>{selectedItem.points ?? 0}pt</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="mt-4 px-4 py-2 rounded-[var(--r2)] text-xs bg-[var(--ink3)] text-[var(--snow)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Layout />
    </AppProvider>
  );
}
