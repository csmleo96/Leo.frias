// Supabase database types — run `npx supabase gen types typescript` to regenerate from real schema

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida'
export type TaskPriority = 'baixa' | 'media' | 'alta'
export type TransactionType = 'receita' | 'despesa'
export type ClientStatus = 'ativo' | 'inativo'

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: { id: string; title: string; description: string | null; status: TaskStatus; priority: TaskPriority; created_at: string }
        Insert: { id?: string; title: string; description?: string | null; status?: TaskStatus; priority?: TaskPriority; created_at?: string }
        Update: { id?: string; title?: string; description?: string | null; status?: TaskStatus; priority?: TaskPriority }
        Relationships: []
      }
      transactions: {
        Row: { id: string; description: string; amount: number; type: TransactionType; category: string; date: string; created_at: string }
        Insert: { id?: string; description: string; amount: number; type: TransactionType; category?: string; date: string; created_at?: string }
        Update: { id?: string; description?: string; amount?: number; type?: TransactionType; category?: string; date?: string }
        Relationships: []
      }
      clients: {
        Row: { id: string; name: string; email: string; phone: string | null; company: string | null; status: ClientStatus; created_at: string }
        Insert: { id?: string; name: string; email: string; phone?: string | null; company?: string | null; status?: ClientStatus; created_at?: string }
        Update: { id?: string; name?: string; email?: string; phone?: string | null; company?: string | null; status?: ClientStatus }
        Relationships: []
      }
      prospects: {
        Row: { id: string; name: string; email: string | null; phone: string | null; company: string | null; status: string; stage: string | null; value: number | null; notes: string | null; created_at: string }
        Insert: { id?: string; name: string; email?: string | null; phone?: string | null; company?: string | null; status?: string; stage?: string | null; value?: number | null; notes?: string | null; created_at?: string }
        Update: { id?: string; name?: string; email?: string | null; phone?: string | null; company?: string | null; status?: string; stage?: string | null; value?: number | null; notes?: string | null }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string; action: string; created_at: string
          module: string | null; description: string | null; level: string | null; error_message: string | null
          resource: string | null; resource_id: string | null; result: string | null
          user_id: string | null; user_email: string | null; origin: string | null
          ip_address: string | null; user_agent: string | null; metadata: Json | null
        }
        Insert: {
          id?: string; action: string; created_at?: string
          module?: string | null; description?: string | null; level?: string | null; error_message?: string | null
          resource?: string | null; resource_id?: string | null; result?: string | null
          user_id?: string | null; user_email?: string | null; origin?: string | null
          ip_address?: string | null; user_agent?: string | null; metadata?: Json | null
        }
        Update: {
          id?: string; action?: string
          module?: string | null; description?: string | null; level?: string | null; error_message?: string | null
          resource?: string | null; resource_id?: string | null; result?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      sync_log: {
        Row: { id: string; source: string; status: string; records: number | null; glpi_synced: number | null; jira_synced: number | null; error: string | null; synced_at: string }
        Insert: { id?: string; source: string; status: string; records?: number | null; glpi_synced?: number | null; jira_synced?: number | null; error?: string | null; synced_at?: string }
        Update: { id?: string; source?: string; status?: string; records?: number | null; glpi_synced?: number | null; jira_synced?: number | null; error?: string | null }
        Relationships: []
      }
      notification_logs: {
        Row: { id: string; channel: string; status: string; recipients: string[] | null; kpis: Json | null; metadata: Json | null; error_message: string | null; executed_at: string; delivery_time: number | null }
        Insert: { id?: string; channel: string; status: string; recipients?: string[] | null; kpis?: Json | null; metadata?: Json | null; error_message?: string | null; executed_at?: string; delivery_time?: number | null }
        Update: { id?: string; channel?: string; status?: string; recipients?: string[] | null; kpis?: Json | null; metadata?: Json | null; error_message?: string | null; delivery_time?: number | null }
        Relationships: []
      }
      glpi_tickets: {
        Row: {
          id: string; title: string; status: number; status_label: string | null
          priority: number; priority_label: string | null; priority_num: number
          type_id: number | null; type_label: string | null
          assignee: string | null; group_id: number | null
          sla_hours: number | null; sla_deadline: string | null; sla_status: string
          created_at: string; updated_at: string; synced_at: string | null
        }
        Insert: {
          id?: string; title: string; status: number; status_label?: string | null
          priority: number; priority_label?: string | null; priority_num?: number
          type_id?: number | null; type_label?: string | null
          assignee?: string | null; group_id?: number | null
          sla_hours?: number | null; sla_deadline?: string | null; sla_status?: string
          created_at?: string; updated_at?: string; synced_at?: string | null
        }
        Update: {
          id?: string; title?: string; status?: number; status_label?: string | null
          priority?: number; priority_label?: string | null; priority_num?: number
          type_id?: number | null; type_label?: string | null
          assignee?: string | null; group_id?: number | null
          sla_hours?: number | null; sla_deadline?: string | null; sla_status?: string
          updated_at?: string; synced_at?: string | null
        }
        Relationships: []
      }
      jira_tickets: {
        Row: {
          id: string; key: string; summary: string | null; title: string
          status: string; status_category: string | null
          priority: string; priority_num: number
          issue_type: string | null; assignee: string | null
          project_key: string; project_name: string | null
          sla_hours: number | null; sla_deadline: string | null; sla_status: string
          url: string | null; created_at: string; updated_at: string; synced_at: string | null
        }
        Insert: {
          id?: string; key?: string; summary?: string | null; title: string
          status: string; status_category?: string | null
          priority: string; priority_num?: number
          issue_type?: string | null; assignee?: string | null
          project_key: string; project_name?: string | null
          sla_hours?: number | null; sla_deadline?: string | null; sla_status?: string
          url?: string | null; created_at?: string; updated_at?: string; synced_at?: string | null
        }
        Update: {
          id?: string; key?: string; summary?: string | null; title?: string
          status?: string; status_category?: string | null
          priority?: string; priority_num?: number
          issue_type?: string | null; assignee?: string | null
          project_key?: string; project_name?: string | null
          sla_hours?: number | null; sla_deadline?: string | null; sla_status?: string
          url?: string | null; updated_at?: string; synced_at?: string | null
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: { id: string; phone: string; name: string | null; contact_name: string | null; last_message: string | null; last_message_at: string | null; unread: number | null; status: string; created_at: string }
        Insert: { id?: string; phone: string; name?: string | null; contact_name?: string | null; last_message?: string | null; last_message_at?: string | null; unread?: number | null; status?: string; created_at?: string }
        Update: { id?: string; phone?: string; name?: string | null; contact_name?: string | null; last_message?: string | null; last_message_at?: string | null; unread?: number | null; status?: string }
        Relationships: []
      }
      whatsapp_messages: {
        Row: { id: string; conversation_id: string | null; phone: string | null; message_id: string | null; direction: string | null; type: string | null; body: string | null; content: string | null; status: string | null; wamid: string | null; timestamp: number | null; created_at: string }
        Insert: { id?: string; conversation_id?: string | null; phone?: string | null; message_id?: string | null; direction?: string | null; type?: string | null; body?: string | null; content?: string | null; status?: string | null; wamid?: string | null; timestamp?: number | null; created_at?: string }
        Update: { id?: string; conversation_id?: string | null; phone?: string | null; message_id?: string | null; direction?: string | null; type?: string | null; body?: string | null; content?: string | null; status?: string | null; wamid?: string | null; timestamp?: number | null }
        Relationships: []
      }
      hubspot_accounts: {
        Row: { id: string; portal_id: string; hub_domain: string | null; hub_name: string | null; is_active: boolean; scope: string | null; connected_at: string; last_sync_at: string | null; token_expires_at: string | null; access_token_enc: string | null; refresh_token_enc: string | null; updated_at: string | null }
        Insert: { id?: string; portal_id: string; hub_domain?: string | null; hub_name?: string | null; is_active?: boolean; scope?: string | null; connected_at?: string; last_sync_at?: string | null; token_expires_at?: string | null; access_token_enc?: string | null; refresh_token_enc?: string | null; updated_at?: string | null }
        Update: { id?: string; portal_id?: string; hub_domain?: string | null; hub_name?: string | null; is_active?: boolean; scope?: string | null; last_sync_at?: string | null; token_expires_at?: string | null; access_token_enc?: string | null; refresh_token_enc?: string | null; updated_at?: string | null }
        Relationships: []
      }
      hubspot_sync_log: {
        Row: { id: string; portal_id: string; action: string; sync_type: string | null; object_type: string | null; status: string; started_at: string | null; records_synced: number | null; finished_at: string | null; duration_ms: number | null }
        Insert: { id?: string; portal_id: string; action?: string; sync_type?: string | null; object_type?: string | null; status: string; started_at?: string | null; records_synced?: number | null; finished_at?: string | null; duration_ms?: number | null }
        Update: { id?: string; portal_id?: string; action?: string; sync_type?: string | null; object_type?: string | null; status?: string; started_at?: string | null; records_synced?: number | null; finished_at?: string | null; duration_ms?: number | null }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row types
export type Task = Database['public']['Tables']['tasks']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Prospect = Database['public']['Tables']['prospects']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']
export type GlpiTicket = Database['public']['Tables']['glpi_tickets']['Row']
export type JiraTicket = Database['public']['Tables']['jira_tickets']['Row']
export type NotificationLog = Database['public']['Tables']['notification_logs']['Row']
export type HubspotAccount = Database['public']['Tables']['hubspot_accounts']['Row']
