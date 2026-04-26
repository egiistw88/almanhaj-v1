import { supabase } from "./supabase";

/**
 * Extracts all [[Note Title]] syntax from an HTML string or text.
 */
export function extractLinks(text: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links = new Set<string>();
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const rawTitle = match[1].trim();
    // Decode simple HTML entities if tiptap encoded them
    const cleanTitle = rawTitle.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    if (cleanTitle) {
      links.add(cleanTitle);
    }
  }
  
  return Array.from(links);
}

/**
 * Synchronizes the note_links table for a given note.
 * Parses the links, finds or creates target notes, and rewriting relationships.
 */
export async function syncNoteLinks(sourceNoteId: string, content: string) {
  const linkTitles = extractLinks(content);
  
  if (linkTitles.length === 0) {
    // Delete all links if no [[title]] found
    await supabase.from('note_links').delete().eq('source_note_id', sourceNoteId);
    return;
  }

  const targetIds: string[] = [];

  for (const title of linkTitles) {
    // 1. Mencari eksistensi catatan target
    // Mengingat tidak ada field `title` terpisah, kita memindai teks `<h1>Judul...</h1>`
    const { data: notes } = await supabase
      .from('notes')
      .select('id')
      .ilike('content', `%<h1>${title}</h1>%`)
      .limit(1);

    if (notes && notes.length > 0) {
      // 2a. Catatan ditemukan
      targetIds.push(notes[0].id);
    } else {
      // 2b. Unresolved Link: Catatan belum ada, buat sebagai *stub* inkubasi.
      const { data: newNote, error } = await supabase
        .from('notes')
        .insert([{
           content: `<h1>${title}</h1>\n<p><em>(Catatan rintisan dari referensi silang)</em></p>`,
           status: 'inkubasi'
        }])
        .select('id')
        .single();
      
      if (!error && newNote) {
        targetIds.push(newNote.id);
      }
    }
  }

  // 3. Atomik rewrite: Hapus relasi lama, masukkan versi baru
  await supabase.from('note_links').delete().eq('source_note_id', sourceNoteId);

  // Filter unique targetIds to prevent duplicate link inserts and exclude self-referencing links
  const uniqueTargetIds = Array.from(new Set(targetIds)).filter(id => id !== sourceNoteId);
  const newLinks = uniqueTargetIds.map(targetId => ({
    source_note_id: sourceNoteId,
    target_note_id: targetId
  }));

  if (newLinks.length > 0) {
    await supabase.from('note_links').insert(newLinks);
  }
}
