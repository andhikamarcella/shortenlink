export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      links: {
        Row: {
          id: string;
          user_id: string | null;
          slug: string;
          original_url: string;
          clicks: number;
          created_at: string;
          is_public: boolean;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          slug: string;
          original_url: string;
          clicks?: number;
          created_at?: string;
          is_public?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          slug?: string;
          original_url?: string;
          clicks?: number;
          created_at?: string;
          is_public?: boolean;
        };
      };
    };
  };
}
