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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          created_at: string
          created_by: string | null
          data_hora_fim: string
          data_hora_inicio: string
          duracao_minutos: number
          empresa: string | null
          historico: Json
          id: string
          lead_id: string | null
          link_reuniao: string | null
          modalidade: string
          nome_cliente: string
          observacoes: string | null
          origem: string | null
          responsavel_email: string
          responsavel_id: string
          segmento: string | null
          servico: string | null
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_hora_fim: string
          data_hora_inicio: string
          duracao_minutos?: number
          empresa?: string | null
          historico?: Json
          id?: string
          lead_id?: string | null
          link_reuniao?: string | null
          modalidade?: string
          nome_cliente: string
          observacoes?: string | null
          origem?: string | null
          responsavel_email: string
          responsavel_id: string
          segmento?: string | null
          servico?: string | null
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_hora_fim?: string
          data_hora_inicio?: string
          duracao_minutos?: number
          empresa?: string | null
          historico?: Json
          id?: string
          lead_id?: string | null
          link_reuniao?: string | null
          modalidade?: string
          nome_cliente?: string
          observacoes?: string | null
          origem?: string | null
          responsavel_email?: string
          responsavel_id?: string
          segmento?: string | null
          servico?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_installments: {
        Row: {
          amount_due: number
          amount_received: number | null
          contract_id: string
          created_at: string
          due_date: string
          id: string
          paid_on: string | null
          ref_month: string
          status: string
        }
        Insert: {
          amount_due: number
          amount_received?: number | null
          contract_id: string
          created_at?: string
          due_date: string
          id?: string
          paid_on?: string | null
          ref_month: string
          status?: string
        }
        Update: {
          amount_due?: number
          amount_received?: number | null
          contract_id?: string
          created_at?: string
          due_date?: string
          id?: string
          paid_on?: string | null
          ref_month?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_installments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          created_at: string
          due_day: number | null
          id: string
          lead_id: string
          monthly_value: number | null
          notes: string
          sale_id: string
          seller_id: string
          starts_on: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_day?: number | null
          id?: string
          lead_id: string
          monthly_value?: number | null
          notes?: string
          sale_id: string
          seller_id: string
          starts_on: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_day?: number | null
          id?: string
          lead_id?: string
          monthly_value?: number | null
          notes?: string
          sale_id?: string
          seller_id?: string
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          client_name: string
          company: string
          created_at: string
          description: string
          entity_id: string
          id: string
          lead_id: string | null
          owner_id: string | null
          read_at: string | null
          type: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          client_name?: string
          company?: string
          created_at?: string
          description: string
          entity_id: string
          id?: string
          lead_id?: string | null
          owner_id?: string | null
          read_at?: string | null
          type: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          client_name?: string
          company?: string
          created_at?: string
          description?: string
          entity_id?: string
          id?: string
          lead_id?: string | null
          owner_id?: string | null
          read_at?: string | null
          type?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          advertises: string
          assigned_to: string | null
          budget: string
          closing_notes: string | null
          company: string
          consent: boolean
          contract_value: number | null
          created_at: string
          followup_date: string | null
          followup_done: boolean
          followup_note: string | null
          followup_time: string | null
          funnel_stage: string
          goals: string[]
          has_site: string
          id: string
          location: string
          loss_reason: string | null
          name: string
          phone: string
          segment: string
          uses_instagram: string
        }
        Insert: {
          advertises: string
          assigned_to?: string | null
          budget: string
          closing_notes?: string | null
          company: string
          consent?: boolean
          contract_value?: number | null
          created_at?: string
          followup_date?: string | null
          followup_done?: boolean
          followup_note?: string | null
          followup_time?: string | null
          funnel_stage?: string
          goals?: string[]
          has_site: string
          id?: string
          location: string
          loss_reason?: string | null
          name: string
          phone: string
          segment: string
          uses_instagram: string
        }
        Update: {
          advertises?: string
          assigned_to?: string | null
          budget?: string
          closing_notes?: string | null
          company?: string
          consent?: boolean
          contract_value?: number | null
          created_at?: string
          followup_date?: string | null
          followup_done?: boolean
          followup_note?: string | null
          followup_time?: string | null
          funnel_stage?: string
          goals?: string[]
          has_site?: string
          id?: string
          location?: string
          loss_reason?: string | null
          name?: string
          phone?: string
          segment?: string
          uses_instagram?: string
        }
        Relationships: []
      }
      sale_payments: {
        Row: {
          amount: number
          created_at: string
          history: Json
          id: string
          method: string
          received_on: string | null
          sale_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          history?: Json
          id?: string
          method?: string
          received_on?: string | null
          sale_id: string
          status: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          history?: Json
          id?: string
          method?: string
          received_on?: string | null
          sale_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          closed_on: string
          contract_status: string
          contract_type: string
          created_at: string
          id: string
          initial_value: number
          lead_id: string
          monthly_value: number
          notes: string
          seller_email: string
          seller_id: string
          service: string
          starts_on: string
          status: string
          updated_at: string
        }
        Insert: {
          closed_on: string
          contract_status?: string
          contract_type: string
          created_at?: string
          id?: string
          initial_value: number
          lead_id: string
          monthly_value?: number
          notes?: string
          seller_email?: string
          seller_id: string
          service: string
          starts_on: string
          status?: string
          updated_at?: string
        }
        Update: {
          closed_on?: string
          contract_status?: string
          contract_type?: string
          created_at?: string
          id?: string
          initial_value?: number
          lead_id?: string
          monthly_value?: number
          notes?: string
          seller_email?: string
          seller_id?: string
          service?: string
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      team_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_email: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_email: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_email?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          email: string
          id: string
          invited_at: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          email: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_leads: { Args: { _user_id: string }; Returns: boolean }
      crm_is_admin: { Args: never; Returns: boolean }
      crm_is_notification_admin: { Args: never; Returns: boolean }
      crm_mark_notifications_read: {
        Args: { ids: string[] }
        Returns: undefined
      }
      crm_register_sale: { Args: { payload: Json }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "super_admin" | "collaborator"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "super_admin", "collaborator"],
    },
  },
} as const
