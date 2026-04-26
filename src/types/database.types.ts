export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string
          title: string
          author: string | null
          category: 'Akidah' | 'Tasawuf' | 'Sirah' | 'Fikih' | 'Mantiq' | 'Keluarga' | 'Lainnya' | null
          core_premise: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          author?: string | null
          category?: 'Akidah' | 'Tasawuf' | 'Sirah' | 'Fikih' | 'Mantiq' | 'Keluarga' | 'Lainnya' | null
          core_premise?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          author?: string | null
          category?: 'Akidah' | 'Tasawuf' | 'Sirah' | 'Fikih' | 'Mantiq' | 'Keluarga' | 'Lainnya' | null
          core_premise?: string | null
          created_at?: string
        }
          Relationships: any[]
      }
      notes: {
        Row: {
          id: string
          content: string
          linked_book_id: string | null
          status: 'inkubasi' | 'permanen'
          created_at: string
          updated_at: string
          embedding?: number[] | null
          yjs_state: string | null
        }
        Insert: {
          id?: string
          content: string
          linked_book_id?: string | null
          status?: 'inkubasi' | 'permanen'
          created_at?: string
          updated_at?: string
          embedding?: number[] | null
          yjs_state?: string | null
        }
        Update: {
          id?: string
          content?: string
          linked_book_id?: string | null
          status?: 'inkubasi' | 'permanen'
          created_at?: string
          updated_at?: string
          embedding?: number[] | null
          yjs_state?: string | null
        }
          Relationships: any[]
      }
      note_links: {
        Row: {
          id: string
          source_note_id: string
          target_note_id: string
          created_at: string
        }
        Insert: {
          id?: string
          source_note_id: string
          target_note_id: string
          created_at?: string
        }
        Update: {
          id?: string
          source_note_id?: string
          target_note_id?: string
          created_at?: string
        }
          Relationships: any[]
      }
      curricula: {
        Row: {
          id: string
          title: string
          progress_percentage: number
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          progress_percentage?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          progress_percentage?: number
          created_at?: string
        }
          Relationships: any[]
      }
      curriculum_tasks: {
        Row: {
          id: string
          curriculum_id: string
          title: string
          is_completed: boolean
          order_index: number
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          curriculum_id: string
          title: string
          is_completed?: boolean
          order_index?: number
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          curriculum_id?: string
          title?: string
          is_completed?: boolean
          order_index?: number
          created_at?: string
          completed_at?: string | null
        }
        Relationships: any[]
      }
      note_embeddings: {
        Row: {
          id: string
          note_id: string
          content: string
          embedding: number[]
        }
        Insert: {
          id?: string
          note_id: string
          content: string
          embedding: number[]
        }
        Update: {
          id?: string
          note_id?: string
          content?: string
          embedding?: number[]
        }
        Relationships: any[]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_notes: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
          p_current_note_id: string
        }
        Returns: {
          id: string
          content: string
          title: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
