export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida'
export type TaskPriority = 'baixa' | 'media' | 'alta'
export type TransactionType = 'receita' | 'despesa'
export type ClientStatus = 'ativo' | 'inativo'

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: TaskStatus
          priority: TaskPriority
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: TaskStatus
          priority?: TaskPriority
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: TaskStatus
          priority?: TaskPriority
        }
      }
      transactions: {
        Row: {
          id: string
          description: string
          amount: number
          type: TransactionType
          category: string
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          description: string
          amount: number
          type: TransactionType
          category?: string
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          description?: string
          amount?: number
          type?: TransactionType
          category?: string
          date?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          company: string | null
          status: ClientStatus
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          company?: string | null
          status?: ClientStatus
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          company?: string | null
          status?: ClientStatus
        }
      }
    }
  }
}

export type Task = Database['public']['Tables']['tasks']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
