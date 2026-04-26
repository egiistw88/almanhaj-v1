import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import { Loader2, Scale } from 'lucide-react';

interface AbunawaEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  isSaving?: boolean;
}

export function AbunawaEditor({ initialContent, onChange, isSaving }: AbunawaEditorProps) {
  const [synced, setSynced] = useState(false);
  const [critique, setCritique] = useState<string | null>(null);
  const [isCritiquing, setIsCritiquing] = useState(false);
  // Add a state to force re-render when selection changes so our button updates natively
  const [, setSelectionRerender] = useState(0);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: () => {
      setSelectionRerender(prev => prev + 1);
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[60vh] text-zinc-300 leading-loose max-w-3xl mx-auto py-2 md:py-4 text-[1.05rem] md:text-[1.125rem] ' +
               '[&_h1]:text-3xl md:[&_h1]:text-4xl [&_h1]:font-serif [&_h1]:text-zinc-100 [&_h1]:mb-10 [&_h1]:mt-14 [&_h1]:tracking-tight [&_h1]:leading-tight ' +
               '[&_h2]:text-2xl md:[&_h2]:text-3xl [&_h2]:font-serif [&_h2]:text-zinc-200 [&_h2]:mb-8 [&_h2]:mt-12 [&_h2]:tracking-tight [&_h2]:leading-snug ' +
               '[&_h3]:text-xl md:[&_h3]:text-2xl [&_h3]:font-serif [&_h3]:text-zinc-300 [&_h3]:mb-6 [&_h3]:mt-10 [&_h3]:leading-snug ' +
               '[&_p]:mb-8 [&_p]:text-zinc-300 ' +
               '[&_ul]:list-disc [&_ul]:ml-6 md:[&_ul]:ml-8 [&_ul]:mb-8 [&_ul>li]:mb-4 [&_ul>li]:text-zinc-300 [&_ol]:list-decimal [&_ol]:ml-6 md:[&_ol]:ml-8 [&_ol]:mb-8 [&_ol>li]:mb-4 [&_ol>li]:text-zinc-300 ' +
               '[&_blockquote]:border-l-4 [&_blockquote]:border-zinc-700/80 [&_blockquote]:pl-6 [&_blockquote]:py-3 [&_blockquote]:italic [&_blockquote]:text-zinc-400 [&_blockquote]:my-10 [&_blockquote]:bg-gradient-to-r [&_blockquote]:from-[#141416] [&_blockquote]:to-transparent [&_blockquote]:rounded-r-xl [&_blockquote>p]:mb-0 ' +
               '[&_code]:font-mono [&_code]:bg-zinc-800/60 [&_code]:text-zinc-300 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded-md [&_code]:text-[0.85em] ' +
               '[&_pre]:bg-[#09090b] [&_pre]:p-6 md:[&_pre]:p-8 [&_pre]:rounded-2xl [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-zinc-800/80 [&_pre]:my-10 [&_pre>code]:bg-transparent [&_pre>code]:p-0 [&_pre>code]:text-[0.9em]',
      },
    },
  });

  useEffect(() => {
    if (editor && initialContent && !synced) {
      if (editor.getHTML() !== initialContent) {
         editor.commands.setContent(initialContent);
         setSynced(true);
      }
    }
  }, [editor, initialContent, synced]);

  if (!editor) {
    return null;
  }

  const handleTestArgument = async () => {
    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      ' '
    );

    if (!selectedText) return;

    setIsCritiquing(true);
    setCritique('Mengundang Munaqisy (Menganalisis argumen)...');

    try {
      const res = await fetch('/api/test-argument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          selectedText,
          fullContext: editor.getText()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCritique(data.critique);
    } catch (error: any) {
      setCritique('Gagal menguji argumen: ' + error.message);
    } finally {
      setIsCritiquing(false);
    }
  };

  const hasSelection = !editor.state.selection.empty;

  return (
    <div className="relative">
       {/* Menu Bar Ringkas */}
       <div className="sticky top-0 z-10 bg-[#09090b]/80 backdrop-blur-xl border border-zinc-800/80 rounded-xl px-4 py-2 mb-8 flex flex-wrap items-center gap-1.5 md:gap-3 shadow-lg mx-auto max-w-3xl">
         <button
           onClick={() => editor.chain().focus().toggleBold().run()}
           className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
         >
           Tebal
         </button>
         <button
           onClick={() => editor.chain().focus().toggleItalic().run()}
           className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
         >
           Miring
         </button>
         <button
           onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
           className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
         >
           H2
         </button>
         <button
           onClick={() => editor.chain().focus().toggleBlockquote().run()}
           className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${editor.isActive('blockquote') ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
         >
           Kutipan
         </button>
         
         <div className="w-[1px] h-4 bg-zinc-800 mx-2"></div>
         
         <button
           onClick={handleTestArgument}
           disabled={!hasSelection || isCritiquing}
           className={`ml-auto px-4 py-1.5 flex items-center font-bold gap-2 text-xs font-sans rounded-lg transition-all ${
             (!hasSelection || isCritiquing) ? 'opacity-40 cursor-not-allowed text-zinc-500 bg-transparent' : 'text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/30 hover:text-indigo-200 shadow-sm'
           }`}
           title="Sorot teks lalu klik untuk diuji secara intelektual"
         >
           {isCritiquing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
           {isCritiquing ? 'Mengkaji Argumen...' : 'Uji Argumen Tersorot'}
         </button>
       </div>
       
       <EditorContent editor={editor} disabled={isSaving} />

       {critique && (
         <div className="fixed bottom-4 right-4 items-stretch md:bottom-8 md:right-8 w-[calc(100vw-2rem)] md:w-[450px] max-h-[80vh] flex flex-col bg-[#0a0a0c] border border-indigo-500/30 rounded-xl shadow-2xl shadow-indigo-500/10 z-[100]">
           <div className="flex justify-between items-start shrink-0 p-4 border-b border-zinc-800/50 bg-zinc-900/40 rounded-t-xl">
             <div className="flex gap-2 items-center text-indigo-400 font-serif text-lg">
               <Scale className="w-5 h-5 text-indigo-400" />
               <h3>Munaqisy (Lawan Debat)</h3>
             </div>
             <button onClick={() => setCritique(null)} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 bg-black/20 rounded-md">
               ✕
             </button>
           </div>
           <div className="p-4 overflow-y-auto text-sm font-sans text-zinc-300 leading-relaxed whitespace-pre-wrap flex-1 min-h-[100px] fancy-scrollbar">
             {critique}
           </div>
           <div className="p-3 border-t border-zinc-800/50 flex justify-end shrink-0 bg-[#0a0a0c] rounded-b-xl">
             <button onClick={() => setCritique(null)} className="text-xs font-mono uppercase tracking-widest text-zinc-500 hover:text-indigo-400 transition-colors">
               Tutup Panel
             </button>
           </div>
         </div>
       )}
    </div>
  );
}
