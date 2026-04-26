import { supabase } from "./supabase";
import { BookInputSchema } from "./validations";
import type { Database } from "@/types/database.types";
import type { ServiceResponse } from "@/types/service.types";

type BookRow = Database['public']['Tables']['books']['Row'];
type BookInsert = Database['public']['Tables']['books']['Insert'];
type BookUpdate = Database['public']['Tables']['books']['Update'];

export const BooksService = {
  async createBook(input: BookInsert): Promise<ServiceResponse<BookRow>> {
    try {
      const validated = BookInputSchema.parse(input);
      const { data, error } = await supabase
        .from('books')
        .insert([validated as BookInsert])
        .select()
        .single();
        
      if (error) throw error;
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal menyimpan pustaka" };
    }
  },

  async listBooks(): Promise<ServiceResponse<BookRow[]>> {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal memuat pustaka" };
    }
  },

  async updateBook(id: string, input: BookUpdate): Promise<ServiceResponse<BookRow>> {
    try {
      const validated = BookInputSchema.partial().parse(input);
      const { data, error } = await supabase
        .from('books')
        .update(validated as BookUpdate)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal memperbarui pustaka" };
    }
  },

  async deleteBook(id: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return { ok: true, data: null };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal menghapus pustaka" };
    }
  }
};
