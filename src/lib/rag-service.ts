export class RagService {
  /**
   * Pecah teks panjang menjadi chunk per paragraf atau per sekian kata
   */
  static chunkText(text: string, maxWords: number = 300): string[] {
    if (!text) return [];
    
    // Pertama, pisahkan berdasarkan paragraf (double newline)
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const chunks: string[] = [];
    
    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/);
      if (words.length <= maxWords) {
        chunks.push(paragraph);
      } else {
        // Jika paragraf terlalu panjang, kita potong per `maxWords` kata
        for (let i = 0; i < words.length; i += maxWords) {
          chunks.push(words.slice(i, i + maxWords).join(' '));
        }
      }
    }
    
    return chunks;
  }
}
