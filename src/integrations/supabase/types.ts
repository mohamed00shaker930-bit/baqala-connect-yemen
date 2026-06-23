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
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_accounts: {
        Row: {
          balance: number
          created_at: string
          customer_id: string
          id: string
          store_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          customer_id: string
          id?: string
          store_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          customer_id?: string
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          note: string | null
          order_id: string | null
          type: Database["public"]["Enums"]["credit_tx_type"]
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          type: Database["public"]["Enums"]["credit_tx_type"]
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          type?: Database["public"]["Enums"]["credit_tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          id: string
          label: string
          landmark_text: string
          lat: number | null
          lng: number | null
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          landmark_text: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          landmark_text?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          name: string
          note: string | null
          order_id: string
          price: number
          product_id: string | null
          qty: number
        }
        Insert: {
          id?: string
          name: string
          note?: string | null
          order_id: string
          price: number
          product_id?: string | null
          qty: number
        }
        Update: {
          id?: string
          name?: string
          note?: string | null
          order_id?: string
          price?: number
          product_id?: string | null
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          credit_status: Database["public"]["Enums"]["credit_status"] | null
          customer_id: string
          id: string
          location_label: string | null
          location_landmark: string | null
          location_lat: number | null
          location_lng: number | null
          location_phone: string | null
          note: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_status?: Database["public"]["Enums"]["credit_status"] | null
          customer_id: string
          id?: string
          location_label?: string | null
          location_landmark?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_phone?: string | null
          note?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_status?: Database["public"]["Enums"]["credit_status"] | null
          customer_id?: string
          id?: string
          location_label?: string | null
          location_landmark?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_phone?: string | null
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          image_url: string | null
          in_stock: boolean
          name: string
          price: number
          store_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          in_stock?: boolean
          name: string
          price: number
          store_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          in_stock?: boolean
          name?: string
          price?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          phone: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          phone: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          order_id: string | null
          stars: number
          store_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id?: string | null
          stars: number
          store_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string | null
          stars?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          area: string | null
          created_at: string
          delivery_info: string | null
          id: string
          image_url: string | null
          is_open: boolean
          lat: number | null
          lng: number | null
          name: string
          owner_id: string
          phone: string | null
          rating: number
          rating_count: number
        }
        Insert: {
          area?: string | null
          created_at?: string
          delivery_info?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          owner_id: string
          phone?: string | null
          rating?: number
          rating_count?: number
        }
        Update: {
          area?: string | null
          created_at?: string
          delivery_info?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          owner_id?: string
          phone?: string | null
          rating?: number
          rating_count?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "merchant"
      credit_status: "pending" | "approved" | "declined"
      credit_tx_type: "charge" | "payment"
      order_status:
        | "sent"
        | "accepted"
        | "preparing"
        | "out_for_delivery"
        | "delivered"
        | "declined"
        | "cancelled"
      payment_method:
        | "cash"
        | "credit"
        | "jeeb"
        | "jawali"
        | "hasab"
        | "onecash"
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
      app_role: ["customer", "merchant"],
      credit_status: ["pending", "approved", "declined"],
      credit_tx_type: ["charge", "payment"],
      order_status: [
        "sent",
        "accepted",
        "preparing",
        "out_for_delivery",
        "delivered",
        "declined",
        "cancelled",
      ],
      payment_method: ["cash", "credit", "jeeb", "jawali", "hasab", "onecash"],
    },
  },
} as const
