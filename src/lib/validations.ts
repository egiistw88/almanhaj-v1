import { z } from "zod";

export const BookInputSchema = z.object({
  title: z.string().min(1, "Judul buku tidak boleh kosong"),
  author: z.string().optional(),
  category: z.enum(['Akidah', 'Tasawuf', 'Sirah', 'Fikih', 'Mantiq', 'Keluarga', 'Lainnya']).optional(),
  core_premise: z.string().optional(),
});

export const QuickCaptureSchema = z.object({
  content: z.string().min(1, "Catatan tidak boleh kosong"),
});

export const CurriculumSchema = z.object({
  title: z.string().min(1, "Judul kurikulum tidak boleh kosong"),
});

export const CurriculumTaskSchema = z.object({
  title: z.string().min(1, "Tugas tidak boleh kosong"),
  order_index: z.number().default(0),
});
