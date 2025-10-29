export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      links: {
        Row: {
          id: string;
          user_id: string | null;
          slug: string;
          destination_url: string;
          created_at: string;
          clicks_count: number;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          slug: string;
          destination_url: string;
          created_at?: string;
          clicks_count?: number;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          slug?: string;
          destination_url?: string;
          created_at?: string;
          clicks_count?: number;
        };
      };
      clicks: {
        Row: {
          id: string;
          slug: string;
          country: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          country?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          country?: string | null;
          created_at?: string;
        };
      };
      feedback: {
        Row: {
          id: string;
          user_id: string;
          message: string;
          created_at: string;
          email: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          message: string;
          created_at?: string;
          email?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          message?: string;
          created_at?: string;
          email?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
