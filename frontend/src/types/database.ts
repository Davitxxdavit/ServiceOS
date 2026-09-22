export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type PaymentMethod = 'cash' | 'card' | 'online' | 'other'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Relationships = Array<{
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}>

type TableDef<Row, Insert = Partial<Row> & Record<string, unknown>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: Relationships
}

export interface Database {
  public: {
    Tables: {
      users: TableDef<
        {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        },
        {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      >
      restaurants: TableDef<{
        id: string
        name: string
        slug: string
        address: string | null
        phone: string | null
        email: string | null
        timezone: string
        currency: string
        logo_url: string | null
        settings: Json
        created_at: string
        updated_at: string
        deleted_at: string | null
      }>
      roles: TableDef<{
        id: string
        name: string
        slug: string
        description: string | null
        created_at: string
        updated_at: string
      }>
      permissions: TableDef<{
        id: string
        key: string
        description: string | null
        created_at: string
        updated_at: string
      }>
      role_permissions: TableDef<{
        id: string
        role_id: string
        permission_id: string
        created_at: string
        updated_at: string
      }>
      employees: TableDef<{
        id: string
        restaurant_id: string
        user_id: string
        role_id: string
        is_active: boolean
        hired_at: string | null
        created_at: string
        updated_at: string
        deleted_at: string | null
      }>
      menu_categories: TableDef<{
        id: string
        restaurant_id: string
        name: string
        description: string | null
        sort_order: number
        is_active: boolean
        created_at: string
        updated_at: string
        deleted_at: string | null
      }>
      menu_items: {
        Row: {
          id: string
          restaurant_id: string
          category_id: string | null
          name: string
          description: string | null
          price: number
          image_url: string | null
          is_available: boolean
          preparation_time_minutes: number
          sort_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          restaurant_id: string
          category_id?: string | null
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          is_available?: boolean
          preparation_time_minutes?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'menu_items_category_id_fkey'
            columns: ['category_id']
            referencedRelation: 'menu_categories'
            referencedColumns: ['id']
          },
        ]
      }
      menu_item_ingredients: TableDef<{
        id: string
        menu_item_id: string
        ingredient_id: string
        quantity: number
        created_at: string
        updated_at: string
      }>
      ingredients: TableDef<{
        id: string
        restaurant_id: string
        name: string
        unit: string
        created_at: string
        updated_at: string
        deleted_at: string | null
      }>
      inventory: {
        Row: {
          id: string
          restaurant_id: string
          ingredient_id: string
          quantity: number
          min_quantity: number
          supplier_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          restaurant_id: string
          ingredient_id: string
          quantity?: number
          min_quantity?: number
          supplier_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['inventory']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'inventory_ingredient_id_fkey'
            columns: ['ingredient_id']
            referencedRelation: 'ingredients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_supplier_id_fkey'
            columns: ['supplier_id']
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      suppliers: TableDef<{
        id: string
        restaurant_id: string
        name: string
        contact_name: string | null
        email: string | null
        phone: string | null
        notes: string | null
        created_at: string
        updated_at: string
        deleted_at: string | null
      }>
      tables: TableDef<{
        id: string
        restaurant_id: string
        name: string
        capacity: number
        status: TableStatus
        position_x: number
        position_y: number
        created_at: string
        updated_at: string
        deleted_at: string | null
      }>
      customers: TableDef<{
        id: string
        restaurant_id: string
        full_name: string
        email: string | null
        phone: string | null
        birthday: string | null
        loyalty_points: number
        notes: string | null
        created_at: string
        updated_at: string
        deleted_at: string | null
      }>
      orders: {
        Row: {
          id: string
          restaurant_id: string
          table_id: string | null
          customer_id: string | null
          employee_id: string | null
          order_number: number
          status: OrderStatus
          priority: number
          subtotal: number
          tax: number
          total: number
          notes: string | null
          accepted_at: string | null
          preparing_at: string | null
          ready_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          restaurant_id: string
          table_id?: string | null
          customer_id?: string | null
          employee_id?: string | null
          order_number?: number
          status?: OrderStatus
          priority?: number
          subtotal?: number
          tax?: number
          total?: number
          notes?: string | null
          accepted_at?: string | null
          preparing_at?: string | null
          ready_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'orders_table_id_fkey'
            columns: ['table_id']
            referencedRelation: 'tables'
            referencedColumns: ['id']
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string | null
          name: string
          quantity: number
          unit_price: number
          total_price: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id?: string | null
          name: string
          quantity?: number
          unit_price: number
          total_price: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      payments: TableDef<{
        id: string
        restaurant_id: string
        order_id: string
        amount: number
        method: PaymentMethod
        status: PaymentStatus
        reference: string | null
        created_at: string
        updated_at: string
        deleted_at: string | null
      }>
      reservations: TableDef<{
        id: string
        restaurant_id: string
        table_id: string | null
        customer_id: string | null
        guest_name: string
        guest_phone: string | null
        party_size: number
        reserved_at: string
        status: string
        notes: string | null
        created_at: string
        updated_at: string
        deleted_at: string | null
      }>
      notifications: TableDef<{
        id: string
        restaurant_id: string
        user_id: string | null
        title: string
        body: string
        type: string
        is_read: boolean
        metadata: Json
        created_at: string
        updated_at: string
        deleted_at: string | null
      }>
      activity_logs: TableDef<{
        id: string
        restaurant_id: string
        user_id: string | null
        action: string
        entity_type: string | null
        entity_id: string | null
        metadata: Json
        created_at: string
        updated_at: string
      }>
    }
    Views: Record<string, never>
    Functions: {
      has_permission: {
        Args: { p_restaurant_id: string; p_permission: string }
        Returns: boolean
      }
      get_employee_restaurant_ids: {
        Args: Record<string, never>
        Returns: string[]
      }
    }
    Enums: {
      order_status: OrderStatus
      table_status: TableStatus
      payment_status: PaymentStatus
      payment_method: PaymentMethod
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type OrderWithItems = Tables<'orders'> & {
  tables?: { name: string } | null
  order_items?: Tables<'order_items'>[] | null
}

export type MenuItemWithCategory = Tables<'menu_items'> & {
  menu_categories?: { name: string } | null
}

export type InventoryRow = Tables<'inventory'> & {
  ingredients: { id: string; name: string; unit: string } | null
  suppliers: { id: string; name: string } | null
}
