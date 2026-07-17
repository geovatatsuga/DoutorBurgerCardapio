export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string; phone: string | null; created_at: string; updated_at: string };
        Insert: { id: string; full_name?: string; phone?: string | null; created_at?: string; updated_at?: string };
        Update: { full_name?: string; phone?: string | null; updated_at?: string };
      };
      stores: {
        Row: { id: string; slug: string; name: string; phone: string | null; address: string | null; min_order_cents: number; delivery_fee_cents: number; delivery_time_label: string; is_active: boolean; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["stores"]["Row"]> & { slug: string; name: string };
        Update: Partial<Database["public"]["Tables"]["stores"]["Row"]>;
      };
      store_memberships: {
        Row: { id: string; store_id: string; user_id: string; role: Database["public"]["Enums"]["membership_role"]; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; store_id: string; user_id: string; role: Database["public"]["Enums"]["membership_role"]; is_active?: boolean };
        Update: { is_active?: boolean; role?: Database["public"]["Enums"]["membership_role"] };
      };
      categories: {
        Row: { id: string; store_id: string; name: string; icon: string | null; sort_order: number; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; store_id: string; name: string; icon?: string | null; sort_order?: number; is_active?: boolean };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      products: {
        Row: { id: string; store_id: string; category_id: string; name: string; description: string; price_cents: number; image_path: string | null; is_active: boolean; is_favorite: boolean; is_combo: boolean; sort_order: number; created_at: string; updated_at: string };
        Insert: { id?: string; store_id: string; category_id: string; name: string; description?: string; price_cents: number; image_path?: string | null; is_active?: boolean; is_favorite?: boolean; is_combo?: boolean; sort_order?: number };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      orders: {
        Row: { id: string; store_id: string; user_id: string | null; order_number: number; source: Database["public"]["Enums"]["order_source"]; fulfillment: Database["public"]["Enums"]["fulfillment_type"]; customer_name: string; customer_phone: string; delivery_address: Json | null; payment_method: Database["public"]["Enums"]["payment_method"]; status: Database["public"]["Enums"]["order_status"]; subtotal_cents: number; delivery_fee_cents: number; total_cents: number; notes: string | null; created_at: string; updated_at: string };
        Insert: never;
        Update: { status?: Database["public"]["Enums"]["order_status"] };
      };
      order_items: {
        Row: { id: string; order_id: string; product_id: string | null; product_name: string; quantity: number; unit_price_cents: number; total_cents: number; notes: string | null; created_at: string };
        Insert: never;
        Update: never;
      };
      payments: {
        Row: { id: string; order_id: string; method: Database["public"]["Enums"]["payment_method"]; status: Database["public"]["Enums"]["payment_status"]; amount_cents: number; provider: string | null; provider_reference: string | null; created_at: string; updated_at: string };
        Insert: never;
        Update: never;
      };
    };
    Functions: {
      place_order: {
        Args: { p_store_id: string; p_fulfillment: Database["public"]["Enums"]["fulfillment_type"]; p_customer_name: string; p_customer_phone: string; p_delivery_address: Json | null; p_payment_method: Database["public"]["Enums"]["payment_method"]; p_items: Json; p_notes?: string | null };
        Returns: string;
      };
      transition_order_status: {
        Args: { p_order_id: string; p_new_status: Database["public"]["Enums"]["order_status"]; p_reason?: string | null };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
    };
    Enums: {
      membership_role: "owner" | "admin" | "manager" | "kitchen" | "cashier";
      order_source: "website" | "ifood" | "manual";
      fulfillment_type: "delivery" | "pickup";
      order_status: "received" | "confirmed" | "preparing" | "ready" | "dispatched" | "completed" | "cancelled";
      payment_method: "pix" | "credit_card" | "debit_card" | "cash" | "ifood";
      payment_status: "pending" | "authorized" | "paid" | "failed" | "refunded" | "cancelled";
    };
  };
};
