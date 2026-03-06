import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { get, post, getApiBaseUrl } from '../api/meridian';
import { toast } from 'sonner';
import { Mic, Send, FileText, Loader2 } from 'lucide-react';

interface Note {
  id: string;
  content: string;
  entry_type?: string;
  created_at: string;
  voice_url?: string | null;
}

function apiPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

interface FieldNotesViewProps {
  projectId: string | null;
  onRefresh?: () => void;
}

export function FieldNotesView({ projectId, onRefresh }: FieldNotesViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const url = projectId
        ? `${apiPath('api/log')}?project_id=${encodeURIComponent(projectId)}`
        : apiPath('api/log');
      const data = await get<Note[]>(url);
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSaveNote = async () => {
    const content = newContent.trim();
    if (!content) return;
    setSaving(true);
    try {
      await post(apiPath('api/log'), {
        project_id: projectId || undefined,
        entry_type: 'note',
        content,
      });
      setNewContent('');
      await loadNotes();
      onRefresh?.();
      toast.success('Note saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const startVoice = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Microphone not supported');
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        try {
          const formData = new FormData();
          formData.append('audio', blob, 'voice.webm');
          const apiBase = getApiBaseUrl();
          const url = apiBase ? `${apiBase}/api/voice/transcribe` : '/api/voice/transcribe';
          const res = await fetch(url, { method: 'POST', body: formData });
          if (!res.ok) throw new Error('Transcribe failed');
          const { transcript } = await res.json();
          if (transcript) {
            await post(apiPath('api/voice/create'), {
              transcript,
              item_type: 'note',
              project_id: projectId || undefined,
            });
            await loadNotes();
            onRefresh?.();
            toast.success('Voice note saved');
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Voice note failed');
        }
        setRecording(false);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      toast.info('Recording… Click again to stop.');
    }).catch(() => toast.error('Microphone access denied'));
  };

  const stopVoice = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Field Notes</h2>
        <p className="text-sm text-gray-500 mt-0.5">Take notes and use voice to capture thoughts.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Write a note…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="min-h-[100px] resize-y"
            disabled={saving}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveNote}
              disabled={saving || !newContent.trim()}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Save
            </Button>
            <Button
              type="button"
              variant={recording ? 'destructive' : 'outline'}
              size="sm"
              onClick={recording ? stopVoice : startVoice}
              className="gap-1.5"
            >
              <Mic className="w-4 h-4" />
              {recording ? 'Stop' : 'Voice'}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading notes…
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Recent notes</h3>
          {notes.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No notes yet. Add one above or use the voice button.</p>
          ) : (
            <ul className="space-y-2">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="flex items-start gap-2 p-3 bg-white border border-gray-200 rounded-lg text-sm"
                >
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {note.created_at ? new Date(note.created_at).toLocaleString() : ''}
                      {note.entry_type === 'ai' || note.voice_url ? ' · Voice' : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
