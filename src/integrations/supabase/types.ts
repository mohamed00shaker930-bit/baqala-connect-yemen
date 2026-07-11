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
      app_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      banners: {
        Row: {
          bg_color: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          link: string | null
          sort_order: number
          store_id: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          bg_color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          sort_order?: number
          store_id?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          bg_color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          sort_order?: number
          store_id?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          main_section: string | null
          name: string
          parent_category: string | null
          sort_order: number
          usage_count: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          main_section?: string | null
          name: string
          parent_category?: string | null
          sort_order?: number
          usage_count?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          main_section?: string | null
          name?: string
          parent_category?: string | null
          sort_order?: number
          usage_count?: number
        }
        Relationships: []
      }
      catalog_items: {
        Row: {
          barcode: string | null
          category_id: string | null
          category_name: string | null
          category_path: string | null
          created_at: string
          default_price: number
          description: string
          id: string
          image_url: string | null
          main_section: string | null
          name: string
          sort_order: number
          source: string
          subcategory: string | null
          usage_count: number
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          category_name?: string | null
          category_path?: string | null
          created_at?: string
          default_price?: number
          description?: string
          id?: string
          image_url?: string | null
          main_section?: string | null
          name: string
          sort_order?: number
          source?: string
          subcategory?: string | null
          usage_count?: number
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          category_name?: string | null
          category_path?: string | null
          created_at?: string
          default_price?: number
          description?: string
          id?: string
          image_url?: string | null
          main_section?: string | null
          name?: string
          sort_order?: number
          source?: string
          subcategory?: string | null
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "catalog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
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
          status: Database["public"]["Enums"]["credit_tx_status"]
          type: Database["public"]["Enums"]["credit_tx_type"]
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          status?: Database["public"]["Enums"]["credit_tx_status"]
          type: Database["public"]["Enums"]["credit_tx_type"]
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          status?: Database["public"]["Enums"]["credit_tx_status"]
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
      custom_product_requests: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          id: string
          image_url: string | null
          merchant_note: string | null
          merchant_price: number | null
          name: string
          order_id: string | null
          qty: number
          status: Database["public"]["Enums"]["custom_request_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          merchant_note?: string | null
          merchant_price?: number | null
          name: string
          order_id?: string | null
          qty?: number
          status?: Database["public"]["Enums"]["custom_request_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          merchant_note?: string | null
          merchant_price?: number | null
          name?: string
          order_id?: string | null
          qty?: number
          status?: Database["public"]["Enums"]["custom_request_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_product_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_product_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_ratings: {
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
            foreignKeyName: "customer_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_ratings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
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
          channel: Database["public"]["Enums"]["order_channel"]
          commission_amount: number
          commission_pct: number
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
          return_reason: string | null
          return_requested_at: string | null
          return_responded_at: string | null
          return_status: Database["public"]["Enums"]["return_status"]
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          total: number
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["order_channel"]
          commission_amount?: number
          commission_pct?: number
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
          return_reason?: string | null
          return_requested_at?: string | null
          return_responded_at?: string | null
          return_status?: Database["public"]["Enums"]["return_status"]
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          total: number
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["order_channel"]
          commission_amount?: number
          commission_pct?: number
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
          return_reason?: string | null
          return_requested_at?: string | null
          return_responded_at?: string | null
          return_status?: Database["public"]["Enums"]["return_status"]
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
      pending_customers: {
        Row: {
          claimed_by_user_id: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          phone: string
          store_id: string
        }
        Insert: {
          claimed_by_user_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          phone: string
          store_id: string
        }
        Update: {
          claimed_by_user_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          phone?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_offers: {
        Row: {
          active: boolean
          created_at: string
          discount_price: number
          ends_at: string | null
          id: string
          max_qty: number | null
          product_id: string
          sold_qty: number
          starts_at: string
          store_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          discount_price: number
          ends_at?: string | null
          id?: string
          max_qty?: number | null
          product_id: string
          sold_qty?: number
          starts_at?: string
          store_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          discount_price?: number
          ends_at?: string | null
          id?: string
          max_qty?: number | null
          product_id?: string
          sold_qty?: number
          starts_at?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_offers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          created_at: string
          id: string
          image_url: string | null
          in_stock: boolean
          lib_category: string | null
          main_section: string | null
          name: string
          price: number
          store_id: string
          subcategory: string | null
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          in_stock?: boolean
          lib_category?: string | null
          main_section?: string | null
          name: string
          price: number
          store_id: string
          subcategory?: string | null
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          in_stock?: boolean
          lib_category?: string | null
          main_section?: string | null
          name?: string
          price?: number
          store_id?: string
          subcategory?: string | null
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
          commission_pct: number | null
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
          status: Database["public"]["Enums"]["store_status"]
        }
        Insert: {
          area?: string | null
          commission_pct?: number | null
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
          status?: Database["public"]["Enums"]["store_status"]
        }
        Update: {
          area?: string | null
          commission_pct?: number | null
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
          status?: Database["public"]["Enums"]["store_status"]
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
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          note: string | null
          order_id: string | null
          reference: string | null
          status: Database["public"]["Enums"]["wallet_tx_status"]
          type: Database["public"]["Enums"]["wallet_tx_type"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          order_id?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["wallet_tx_status"]
          type: Database["public"]["Enums"]["wallet_tx_type"]
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          order_id?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["wallet_tx_status"]
          type?: Database["public"]["Enums"]["wallet_tx_type"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_broadcast_notification: {
        Args: { _body: string; _link: string; _segment: string; _title: string }
        Returns: number
      }
      admin_grant_admin: { Args: { _uid: string }; Returns: undefined }
      admin_respond_wallet_tx: {
        Args: { _approve: boolean; _tx: string }
        Returns: undefined
      }
      admin_revoke_admin: { Args: { _uid: string }; Returns: undefined }
      admin_set_setting: {
        Args: { _key: string; _value: Json }
        Returns: undefined
      }
      admin_set_store_commission: {
        Args: { _pct: number; _store: string }
        Returns: undefined
      }
      admin_set_store_status: {
        Args: { _status: string; _store: string }
        Returns: undefined
      }
      assign_my_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      catalog_category_counts: {
        Args: never
        Returns: {
          category_id: string
          items_count: number
        }[]
      }
      customer_request_return: {
        Args: { _order_id: string; _reason: string }
        Returns: undefined
      }
      customer_respond_credit: {
        Args: { _approve: boolean; _tx_id: string }
        Returns: undefined
      }
      ensure_wallet: { Args: never; Returns: string }
      get_credit_customer: {
        Args: { _account_id: string }
        Returns: {
          name: string
          phone: string
        }[]
      }
      get_order_customer: {
        Args: { _order_id: string }
        Returns: {
          name: string
          phone: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _uid?: string }; Returns: boolean }
      pay_order_with_wallet: { Args: { _order_id: string }; Returns: undefined }
      push_notification: {
        Args: {
          _body: string
          _link: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      search_customers_by_name: {
        Args: { _q: string }
        Returns: {
          id: string
          name: string
          phone: string
        }[]
      }
    }
    Enums: {
      app_role: "customer" | "merchant"
      credit_status: "pending" | "approved" | "declined"
      credit_tx_status: "pending" | "approved" | "rejected"
      credit_tx_type: "charge" | "payment"
      custom_request_status:
        | "pending"
        | "quoted"
        | "accepted"
        | "rejected"
        | "converted"
      order_channel: "online" | "in_store"
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
      return_status: "none" | "requested" | "approved" | "rejected"
      store_status: "pending" | "active" | "suspended" | "rejected"
      wallet_tx_status: "pending" | "approved" | "rejected"
      wallet_tx_type: "topup" | "payment" | "refund" | "adjustment"
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
      credit_tx_status: ["pending", "approved", "rejected"],
      credit_tx_type: ["charge", "payment"],
      custom_request_status: [
        "pending",
        "quoted",
        "accepted",
        "rejected",
        "converted",
      ],
      order_channel: ["online", "in_store"],
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
      return_status: ["none", "requested", "approved", "rejected"],
      store_status: ["pending", "active", "suspended", "rejected"],
      wallet_tx_status: ["pending", "approved", "rejected"],
      wallet_tx_type: ["topup", "payment", "refund", "adjustment"],
    },
  },
} as const
