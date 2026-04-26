import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import * as idb from 'idb-keyval';
import { supabase } from './supabase';
import { mergeYjs } from './yjs-utils';
import type { Database } from '../types/database.types';

type NoteRow = Database['public']['Tables']['notes']['Row'];
type BookRow = Database['public']['Tables']['books']['Row'];
type CurriculumRow = Database['public']['Tables']['curricula']['Row'];
type TaskRow = Database['public']['Tables']['curriculum_tasks']['Row'];

// Custom storage parameter for Zustand using idb-keyval
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await idb.get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idb.set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await idb.del(name);
  },
};

interface SyncState {
  lastSyncAt: number;
  isSyncing: boolean;
  syncError: string | null;
}

interface AppState {
  notes: Record<string, NoteRow>;
  books: Record<string, BookRow>;
  curricula: Record<string, CurriculumRow>;
  tasks: Record<string, TaskRow>;
  
  // Dirty tracking (IDs of records that need to be pushed to Supabase)
  dirtyNotes: Set<string>;
  dirtyBooks: Set<string>;
  dirtyCurricula: Set<string>;
  dirtyTasks: Set<string>;
  dirtyEmbeddings: Set<string>;

  syncState: SyncState;

  // Actions
  setNotes: (notes: NoteRow[]) => void;
  upsertNote: (note: NoteRow, isLocalAction?: boolean) => void;
  deleteNote: (id: string, isLocalAction?: boolean) => void;

  setBooks: (books: BookRow[]) => void;
  upsertBook: (book: BookRow, isLocalAction?: boolean) => void;
  deleteBook: (id: string, isLocalAction?: boolean) => void;

  setCurricula: (curricula: CurriculumRow[]) => void;
  upsertCurriculum: (curriculum: CurriculumRow, isLocalAction?: boolean) => void;
  
  setTasks: (tasks: TaskRow[]) => void;
  upsertTask: (task: TaskRow, isLocalAction?: boolean) => void;

  // Sync methods
  pullFromCloud: () => Promise<void>;
  pushToCloud: () => Promise<void>;
  syncEmbeddingsWorker: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      notes: {},
      books: {},
      curricula: {},
      tasks: {},
      
      dirtyNotes: new Set(),
      dirtyBooks: new Set(),
      dirtyCurricula: new Set(),
      dirtyTasks: new Set(),
      dirtyEmbeddings: new Set(),

      syncState: {
        lastSyncAt: 0,
        isSyncing: false,
        syncError: null,
      },

      setNotes: (notes) => set((state) => {
        const newNotes = { ...state.notes };
        notes.forEach(n => newNotes[n.id] = n);
        return { notes: newNotes };
      }),
      upsertNote: (note, isLocalAction = false) => set((state) => {
        const dirtyNotes = new Set(state.dirtyNotes);
        const dirtyEmbeddings = new Set(state.dirtyEmbeddings);
        if (isLocalAction) {
          dirtyNotes.add(note.id);
          dirtyEmbeddings.add(note.id);
        }
        return { 
          notes: { ...state.notes, [note.id]: note },
          dirtyNotes,
          dirtyEmbeddings
        };
      }),
      deleteNote: (id, isLocalAction = false) => set((state) => {
        const newNotes = { ...state.notes };
        delete newNotes[id];
        // Note: For full master-master offline, we'd need a tombstone table.
        // For now, we omit it from local. Deletions are complex in local-first without tombstones.
        return { notes: newNotes };
      }),

      setBooks: (books) => set((state) => {
        const newBooks = { ...state.books };
        books.forEach(b => newBooks[b.id] = b);
        return { books: newBooks };
      }),
      upsertBook: (book, isLocalAction = false) => set((state) => {
        const dirtyBooks = new Set(state.dirtyBooks);
        if (isLocalAction) dirtyBooks.add(book.id);
        return { 
          books: { ...state.books, [book.id]: book },
          dirtyBooks
        };
      }),
      deleteBook: (id, isLocalAction = false) => set((state) => {
        const newBooks = { ...state.books };
        delete newBooks[id];
        return { books: newBooks };
      }),

      setCurricula: (curricula) => set((state) => {
        const newCurricula = { ...state.curricula };
        curricula.forEach(c => newCurricula[c.id] = c);
        return { curricula: newCurricula };
      }),
      upsertCurriculum: (curriculum, isLocalAction = false) => set((state) => {
        const dirtyCurricula = new Set(state.dirtyCurricula);
        if (isLocalAction) dirtyCurricula.add(curriculum.id);
        return { 
          curricula: { ...state.curricula, [curriculum.id]: curriculum },
          dirtyCurricula 
        };
      }),

      setTasks: (tasks) => set((state) => {
        const newTasks = { ...state.tasks };
        tasks.forEach(t => newTasks[t.id] = t);
        return { tasks: newTasks };
      }),
      upsertTask: (task, isLocalAction = false) => set((state) => {
        const dirtyTasks = new Set(state.dirtyTasks);
        if (isLocalAction) dirtyTasks.add(task.id);
        return { 
          tasks: { ...state.tasks, [task.id]: task },
          dirtyTasks 
        };
      }),

      pullFromCloud: async () => {
        try {
          set({ syncState: { ...get().syncState, isSyncing: true, syncError: null } });
          
          // Basic pull
          const [notesRes, booksRes, curriculaRes, tasksRes] = await Promise.all([
            supabase.from('notes').select('*'),
            supabase.from('books').select('*'),
            supabase.from('curricula').select('*'),
            supabase.from('curriculum_tasks').select('*')
          ]);

          // Yjs CRDT Merge for Notes
          if (notesRes.data) {
            const currentNotes = get().notes;
            const newNotes = { ...currentNotes };
            const dirtyNotes = new Set(get().dirtyNotes);
            
            notesRes.data.forEach((remoteNote) => {
              const localNote = currentNotes[remoteNote.id];
              
              if (localNote) {
                if (localNote.yjs_state && remoteNote.yjs_state) {
                    const isLocalDirty = dirtyNotes.has(remoteNote.id);
                    if (localNote.yjs_state !== remoteNote.yjs_state) {
                        const { mergedBase64, mergedText } = mergeYjs(localNote.yjs_state, remoteNote.yjs_state);
                        
                        // If local was edited recently, keep local metadata. Otherwise accept remote metadata.
                        const baseNoteData = isLocalDirty ? { ...remoteNote, ...localNote } : { ...remoteNote };
                        newNotes[remoteNote.id] = { ...baseNoteData, content: mergedText, yjs_state: mergedBase64 };
                        
                        if (mergedBase64 !== remoteNote.yjs_state || isLocalDirty) {
                            dirtyNotes.add(remoteNote.id); // Need to push back
                        } else {
                            dirtyNotes.delete(remoteNote.id);
                        }
                    } else {
                        newNotes[remoteNote.id] = isLocalDirty ? { ...remoteNote, ...localNote } : remoteNote;
                        if (!isLocalDirty) dirtyNotes.delete(remoteNote.id);
                    }
                } else if (dirtyNotes.has(remoteNote.id)) {
                    // Local is dirty but no Yjs. Standard LWW: Keep local.
                    newNotes[remoteNote.id] = { ...remoteNote, ...localNote };
                } else {
                    newNotes[remoteNote.id] = remoteNote;
                }
              } else {
                newNotes[remoteNote.id] = remoteNote;
              }
            });
            
            set({ notes: newNotes, dirtyNotes });
          }

          if (booksRes.data) {
            const newBooks = { ...get().books };
            booksRes.data.forEach(remote => {
                if (!get().dirtyBooks.has(remote.id)) {
                    newBooks[remote.id] = remote;
                }
            });
            set({ books: newBooks });
          }

          if (curriculaRes.data) {
            const newCurricula = { ...get().curricula };
            curriculaRes.data.forEach(remote => {
                if (!get().dirtyCurricula.has(remote.id)) {
                    newCurricula[remote.id] = remote;
                }
            });
            set({ curricula: newCurricula });
          }

          if (tasksRes.data) {
            const newTasks = { ...get().tasks };
            tasksRes.data.forEach(remote => {
                if (!get().dirtyTasks.has(remote.id)) {
                    newTasks[remote.id] = remote;
                }
            });
            set({ tasks: newTasks });
          }

          set({ syncState: { isSyncing: false, syncError: null, lastSyncAt: Date.now() } });
        } catch (err: any) {
          set({ syncState: { ...get().syncState, isSyncing: false, syncError: err.message } });
        }
      },

      pushToCloud: async () => {
        const state = get();
        if (state.dirtyNotes.size === 0 && state.dirtyBooks.size === 0 && state.dirtyCurricula.size === 0 && state.dirtyTasks.size === 0) {
          return; // Nothing to push
        }

        try {
          set({ syncState: { ...state.syncState, isSyncing: true, syncError: null } });

          let notesToPush: any[] = [];
          let booksToPush: any[] = [];
          let curriculaToPush: any[] = [];
          let tasksToPush: any[] = [];

          // Push Notes
          if (state.dirtyNotes.size > 0) {
            notesToPush = Array.from(state.dirtyNotes).map(id => state.notes[id]).filter(Boolean);
            if (notesToPush.length > 0) await supabase.from('notes').upsert(notesToPush);
          }

          // Push Books
          if (state.dirtyBooks.size > 0) {
            booksToPush = Array.from(state.dirtyBooks).map(id => state.books[id]).filter(Boolean);
            if (booksToPush.length > 0) await supabase.from('books').upsert(booksToPush);
          }

          // Push Curricula
          if (state.dirtyCurricula.size > 0) {
            curriculaToPush = Array.from(state.dirtyCurricula).map(id => state.curricula[id]).filter(Boolean);
            if (curriculaToPush.length > 0) await supabase.from('curricula').upsert(curriculaToPush);
          }

          // Push Tasks
          if (state.dirtyTasks.size > 0) {
            tasksToPush = Array.from(state.dirtyTasks).map(id => state.tasks[id]).filter(Boolean);
            if (tasksToPush.length > 0) await supabase.from('curriculum_tasks').upsert(tasksToPush);
          }

          // Clear only the pushed items from dirty sets to avoid race conditions with local edits happening during async push
          set((state) => {
            const nextDirtyNotes = new Set(state.dirtyNotes);
            if (notesToPush) notesToPush.forEach(n => nextDirtyNotes.delete(n.id));
            
            const nextDirtyBooks = new Set(state.dirtyBooks);
            if (booksToPush) booksToPush.forEach(b => nextDirtyBooks.delete(b.id));

            const nextDirtyCurricula = new Set(state.dirtyCurricula);
            if (curriculaToPush) curriculaToPush.forEach(c => nextDirtyCurricula.delete(c.id));

            const nextDirtyTasks = new Set(state.dirtyTasks);
            if (tasksToPush) tasksToPush.forEach(t => nextDirtyTasks.delete(t.id));

            return {
              dirtyNotes: nextDirtyNotes,
              dirtyBooks: nextDirtyBooks,
              dirtyCurricula: nextDirtyCurricula,
              dirtyTasks: nextDirtyTasks,
              syncState: { isSyncing: false, syncError: null, lastSyncAt: Date.now() }
            };
          });

        } catch (err: any) {
          set({ syncState: { ...get().syncState, isSyncing: false, syncError: err.message } });
        }
      },
      syncEmbeddingsWorker: async () => {
        const state = get();
        if (state.dirtyEmbeddings.size === 0) return;

        // Take only one note at a time to slowly process in background
        const [noteId] = Array.from(state.dirtyEmbeddings);
        const note = state.notes[noteId];
        
        if (!note || !note.content) {
           const newDirty = new Set(state.dirtyEmbeddings);
           newDirty.delete(noteId);
           set({ dirtyEmbeddings: newDirty });
           return;
        }

        try {
          // Dinamically import RagService so it doesn't break initialization
          const { RagService } = await import('./rag-service');
          
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          
          const chunks = RagService.chunkText(note.content, 100);
          const embeddingsToInsert = [];

          for (const chunk of chunks) {
            try {
              const response = await ai.models.embedContent({
                model: "gemini-embedding-2-preview",
                contents: chunk,
              });

              if (response.embeddings && response.embeddings.length > 0) {
                 embeddingsToInsert.push({
                   note_id: noteId,
                   content: chunk,
                   embedding: response.embeddings[0].values
                 });
              }
            } catch (err: any) {
              console.error("Embedding generation failed for chunk:", err);
              throw new Error("Gagal komputasi AI Embed: " + err.message);
            }
          }

          // Delete old chunk embeddings
          await supabase.from('note_embeddings').delete().eq('note_id', noteId);

          // Insert new ones
          if (embeddingsToInsert.length > 0) {
            await supabase.from('note_embeddings').insert(embeddingsToInsert);
          }

          const newDirty = new Set(get().dirtyEmbeddings);
          newDirty.delete(noteId);
          set({ dirtyEmbeddings: newDirty });
        } catch(err) {
          console.error("Background AI Embedding Worker Error:", err);
          // Biarkan di dirtyEmbeddings agar dicoba lagi nanti
        }
      }
    }),
    {
      name: 'al-manhaj-storage', // key in storage
      storage: createJSONStorage(() => idbStorage),
      // We need to serialize Sets, so we provide custom replacer/reviver or just transform before saving if needed.
      // But Zustand persist automatically stringifies, which drops Sets.
      // We must handle Set serialization manually:
      partialize: (state) => ({
        notes: state.notes,
        books: state.books,
        curricula: state.curricula,
        tasks: state.tasks,
        dirtyNotes: Array.from(state.dirtyNotes),
        dirtyBooks: Array.from(state.dirtyBooks),
        dirtyCurricula: Array.from(state.dirtyCurricula),
        dirtyTasks: Array.from(state.dirtyTasks),
        dirtyEmbeddings: Array.from(state.dirtyEmbeddings),
        syncState: state.syncState,
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        dirtyNotes: new Set(persistedState.dirtyNotes || []),
        dirtyBooks: new Set(persistedState.dirtyBooks || []),
        dirtyCurricula: new Set(persistedState.dirtyCurricula || []),
        dirtyTasks: new Set(persistedState.dirtyTasks || []),
        dirtyEmbeddings: new Set(persistedState.dirtyEmbeddings || []),
      }),
    }
  )
);
