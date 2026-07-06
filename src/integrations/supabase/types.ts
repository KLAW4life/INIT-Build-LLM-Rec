export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      form_answers: {
        Row: {
          application_id: string
          field_id: string
          file_name: string | null
          file_path: string | null
          id: string
          value_text: string | null
        }
        Insert: {
          application_id: string
          field_id: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          value_text?: string | null
        }
        Update: {
          application_id?: string
          field_id?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_answers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "form_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_answers_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      form_applications: {
        Row: {
          applicant_id: string
          decided_at: string | null
          form_id: string
          id: string
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string
          team_id: string | null
        }
        Insert: {
          applicant_id: string
          decided_at?: string | null
          form_id: string
          id?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          team_id?: string | null
        }
        Update: {
          applicant_id?: string
          decided_at?: string | null
          form_id?: string
          id?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_applications_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_applications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          field_type: Database["public"]["Enums"]["field_type"]
          form_id: string
          id: string
          label: string
          options: Json
          position: number
          required: boolean
        }
        Insert: {
          created_at?: string
          field_type: Database["public"]["Enums"]["field_type"]
          form_id: string
          id?: string
          label: string
          options?: Json
          position?: number
          required?: boolean
        }
        Update: {
          created_at?: string
          field_type?: Database["public"]["Enums"]["field_type"]
          form_id?: string
          id?: string
          label?: string
          options?: Json
          position?: number
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          allow_team_selection: boolean
          closed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          hub_id: string
          id: string
          published_at: string | null
          status: Database["public"]["Enums"]["form_status"]
          title: string
          updated_at: string
        }
        Insert: {
          allow_team_selection?: boolean
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          hub_id: string
          id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          title: string
          updated_at?: string
        }
        Update: {
          allow_team_selection?: boolean
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          hub_id?: string
          id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_custom_roles: {
        Row: {
          created_at: string
          description: string | null
          hub_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hub_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hub_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_custom_roles_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_member_custom_roles: {
        Row: {
          assigned_at: string
          hub_id: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          hub_id: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          hub_id?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_member_custom_roles_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_member_custom_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "hub_custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_members: {
        Row: {
          hub_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["hub_role"]
          user_id: string
        }
        Insert: {
          hub_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["hub_role"]
          user_id: string
        }
        Update: {
          hub_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["hub_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_members_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_role_permissions: {
        Row: {
          id: string
          page: Database["public"]["Enums"]["hub_page"]
          role_id: string
        }
        Insert: {
          id?: string
          page: Database["public"]["Enums"]["hub_page"]
          role_id: string
        }
        Update: {
          id?: string
          page?: Database["public"]["Enums"]["hub_page"]
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "hub_custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      hubs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          join_code: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          join_code: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          join_code?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          hub_id: string
          id: string
          lead_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hub_id: string
          id?: string
          lead_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hub_id?: string
          id?: string
          lead_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_hub_role: {
        Args: {
          _hub_id: string
          _role: Database["public"]["Enums"]["hub_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_page_permission: {
        Args: {
          _hub_id: string
          _page: Database["public"]["Enums"]["hub_page"]
          _user_id: string
        }
        Returns: boolean
      }
      is_hub_member: {
        Args: { _hub_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      application_status: "submitted" | "accepted" | "rejected"
      field_type:
        | "text"
        | "textarea"
        | "number"
        | "email"
        | "select"
        | "checkbox"
        | "file"
      form_status: "draft" | "open" | "closed"
      hub_page: "forms" | "teams" | "members" | "roles" | "applications"
      hub_role: "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: ["submitted", "accepted", "rejected"],
      field_type: [
        "text",
        "textarea",
        "number",
        "email",
        "select",
        "checkbox",
        "file",
      ],
      form_status: ["draft", "open", "closed"],
      hub_page: ["forms", "teams", "members", "roles", "applications"],
      hub_role: ["admin", "member"],
    },
  },
} as const
