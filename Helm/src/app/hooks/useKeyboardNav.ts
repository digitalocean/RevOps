import { useEffect, useCallback } from 'react';

interface UseKeyboardNavOptions {
  items: { id: string }[];
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  onOpenItem?: (id: string) => void;
  onCompleteItem?: (id: string) => void;
  onDeleteItem?: (id: string) => void;
  enabled?: boolean;
}

export function useKeyboardNav({
  items,
  focusedId,
  setFocusedId,
  onOpenItem,
  onCompleteItem,
  onDeleteItem,
  enabled = true,
}: UseKeyboardNavOptions) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    const target = e.target as HTMLElement;
    const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    if (inInput) return;

    const idx = items.findIndex(i => i.id === focusedId);

    switch (e.key) {
      case 'j':
      case 'ArrowDown': {
        e.preventDefault();
        const next = idx < items.length - 1 ? items[idx + 1] : items[0];
        if (next) setFocusedId(next.id);
        break;
      }
      case 'k':
      case 'ArrowUp': {
        e.preventDefault();
        const prev = idx > 0 ? items[idx - 1] : items[items.length - 1];
        if (prev) setFocusedId(prev.id);
        break;
      }
      case 'Enter':
      case 'e': {
        if (focusedId && onOpenItem) { e.preventDefault(); onOpenItem(focusedId); }
        break;
      }
      case ' ': {
        if (focusedId && onCompleteItem) { e.preventDefault(); onCompleteItem(focusedId); }
        break;
      }
      case 'Delete':
      case 'Backspace': {
        if (e.key === 'Backspace' && !e.metaKey) break; // only ⌘Backspace for delete
        if (focusedId && onDeleteItem) { e.preventDefault(); onDeleteItem(focusedId); }
        break;
      }
      case 'Escape': {
        setFocusedId(null);
        break;
      }
    }
  }, [enabled, items, focusedId, setFocusedId, onOpenItem, onCompleteItem, onDeleteItem]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);
}
