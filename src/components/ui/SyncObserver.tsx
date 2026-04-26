import { useEffect, useState } from 'react';
import { useAppStore } from '../../lib/store';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

export function SyncObserver() {
  const { pullFromCloud, pushToCloud, syncEmbeddingsWorker, syncState, dirtyNotes, dirtyBooks, dirtyCurricula, dirtyTasks, dirtyEmbeddings } = useAppStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      pushToCloud();
      pullFromCloud();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pull
    if (navigator.onLine) {
      pullFromCloud();
    }

    // Periodic sync every 2 minutes if online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        pushToCloud();
        syncEmbeddingsWorker();
      }
    }, 60000); // Changed to 1 minute

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [pullFromCloud, pushToCloud, syncEmbeddingsWorker]);

  const totalDirty = dirtyNotes.size + dirtyBooks.size + dirtyCurricula.size + dirtyTasks.size;
  const embeddingQueueLength = dirtyEmbeddings?.size || 0;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2 group">
      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-widest uppercase flex items-center gap-2 shadow-xl">
        {syncState.isSyncing ? (
          <><RefreshCw className="w-3 h-3 animate-spin text-indigo-400" /> Menyinkronkan...</>
        ) : !isOnline ? (
          <><CloudOff className="w-3 h-3 text-red-400" /> Mode Luring {(totalDirty > 0) && `(${totalDirty} Tertunda)`}</>
        ) : (
          <>
            <Cloud className="w-3 h-3 text-emerald-400" /> Tersinkronkan
            {embeddingQueueLength > 0 && <span className="ml-1 text-amber-500">[{embeddingQueueLength} AI Pending]</span>}
          </>
        )}
      </div>
      
      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg group-hover:bg-zinc-800 transition-colors">
        {!isOnline ? (
          <CloudOff className="w-4 h-4 text-red-500" />
        ) : syncState.isSyncing ? (
          <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
        ) : totalDirty > 0 ? (
          <Cloud className="w-4 h-4 text-amber-500 animate-pulse" />
        ) : (
          <Cloud className="w-4 h-4 text-emerald-500" />
        )}
      </div>
    </div>
  );
}
