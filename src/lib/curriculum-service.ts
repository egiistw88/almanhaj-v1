import { supabase } from "./supabase";
import { CurriculumSchema, CurriculumTaskSchema } from "./validations";
import type { Database } from "@/types/database.types";
import type { ServiceResponse } from "@/types/service.types";

type CurriculumRow = Database['public']['Tables']['curricula']['Row'];
type TaskRow = Database['public']['Tables']['curriculum_tasks']['Row'];

export const CurriculumService = {
  async getCurriculaList(): Promise<ServiceResponse<(CurriculumRow & { tasks: TaskRow[] })[]>> {
    try {
      const { data, error } = await supabase
        .from('curricula')
        .select(`
          *,
          tasks:curriculum_tasks(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Sort tasks by order_index locally
      const sortedData = data.map((c: any) => ({
        ...c,
        tasks: Array.isArray(c.tasks) 
          ? c.tasks.sort((a: TaskRow, b: TaskRow) => a.order_index - b.order_index) 
          : []
      }));
      
      return { ok: true, data: sortedData };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal memuat kurikulum" };
    }
  },

  async createCurriculum(title: string): Promise<ServiceResponse<CurriculumRow>> {
    try {
      const validated = CurriculumSchema.parse({ title });
      const { data, error } = await supabase
        .from('curricula')
        .insert([{ title: validated.title, progress_percentage: 0 }])
        .select()
        .single();

      if (error) throw error;
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal membuat kurikulum" };
    }
  },

  async addTask(curriculumId: string, title: string, order_index: number = 0): Promise<ServiceResponse<TaskRow>> {
    try {
      const validated = CurriculumTaskSchema.parse({ title, order_index });
      const { data, error } = await supabase
        .from('curriculum_tasks')
        .insert([{ 
          curriculum_id: curriculumId, 
          title: validated.title, 
          order_index: validated.order_index 
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Update progress automatically
      await this.recalculateProgress(curriculumId);
      
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal menambahkan tugas" };
    }
  },

  async toggleTask(taskId: string, is_completed: boolean): Promise<ServiceResponse<TaskRow>> {
    try {
      // Get the task first to know which curriculum to update
      const { data: task, error: fetchError } = await supabase
        .from('curriculum_tasks')
        .update({ 
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null
        })
        .eq('id', taskId)
        .select()
        .single();

      if (fetchError) throw fetchError;

      // Update progress automatically
      await this.recalculateProgress(task.curriculum_id);

      return { ok: true, data: task };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal mengubah status tugas" };
    }
  },

  async deleteTask(taskId: string, curriculumId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('curriculum_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      await this.recalculateProgress(curriculumId);
      return { ok: true, data: undefined };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal menghapus tugas" };
    }
  },

  async deleteCurriculum(curriculumId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('curricula')
        .delete()
        .eq('id', curriculumId);

      if (error) throw error;
      return { ok: true, data: undefined };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal menghapus kurikulum" };
    }
  },

  async getProgress(curriculumId: string): Promise<ServiceResponse<number>> {
    try {
      const { data, error } = await supabase
        .from('curricula')
        .select('progress_percentage')
        .eq('id', curriculumId)
        .single();

      if (error) throw error;
      return { ok: true, data: data.progress_percentage };
    } catch (err: any) {
      return { ok: false, error: err.message || "Gagal mendapat progress" };
    }
  },

  // Internal helper to calculate percentage
  async recalculateProgress(curriculumId: string): Promise<void> {
    const { data: tasks } = await supabase
      .from('curriculum_tasks')
      .select('is_completed')
      .eq('curriculum_id', curriculumId);

    if (!tasks || tasks.length === 0) return;

    const completedCount = tasks.filter(t => t.is_completed).length;
    const progress_percentage = Math.round((completedCount / tasks.length) * 100);

    await supabase
      .from('curricula')
      .update({ progress_percentage })
      .eq('id', curriculumId);
  }
};
