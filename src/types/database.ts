export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      card_listings: {
        Row: {
          card_id: string
          conversation_count: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          description: string | null
          id: string
          is_active: boolean
          item_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          looking_for: string[]
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          price: number | null
          quantity: number
          seller_id: string
          updated_at: string
          view_count: number
        }
        Insert: {
          card_id: string
          conversation_count?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          id?: string
          is_active?: boolean
          item_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          looking_for?: string[]
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          price?: number | null
          quantity?: number
          seller_id?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          card_id?: string
          conversation_count?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          id?: string
          is_active?: boolean
          item_id?: string
          listing_type?: Database["public"]["Enums"]["listing_type"]
          looking_for?: string[]
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          price?: number | null
          quantity?: number
          seller_id?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "card_listings_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "pokemon_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_listings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "collection_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_item_photos: {
        Row: {
          created_at: string
          id: string
          item_id: string
          medium_path: string
          owner_id: string
          position: number
          thumb_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          medium_path: string
          owner_id: string
          position?: number
          thumb_path: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          medium_path?: string
          owner_id?: string
          position?: number
          thumb_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_item_photos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "collection_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_item_photos_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          card_id: string
          collection_id: string
          condition: Database["public"]["Enums"]["card_condition"]
          created_at: string
          estimated_value: number | null
          grade: number | null
          grading_company: string | null
          id: string
          notes: string | null
          owner_id: string
          position: number
          printing: string
          quantity: number
          updated_at: string
          value_currency: Database["public"]["Enums"]["currency_code"]
        }
        Insert: {
          card_id: string
          collection_id: string
          condition?: Database["public"]["Enums"]["card_condition"]
          created_at?: string
          estimated_value?: number | null
          grade?: number | null
          grading_company?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          position?: number
          printing?: string
          quantity?: number
          updated_at?: string
          value_currency?: Database["public"]["Enums"]["currency_code"]
        }
        Update: {
          card_id?: string
          collection_id?: string
          condition?: Database["public"]["Enums"]["card_condition"]
          created_at?: string
          estimated_value?: number | null
          grade?: number | null
          grading_company?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          position?: number
          printing?: string
          quantity?: number
          updated_at?: string
          value_currency?: Database["public"]["Enums"]["currency_code"]
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "pokemon_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          is_public: boolean
          name: string
          owner_id: string
          position: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_public?: boolean
          name: string
          owner_id: string
          position?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_public?: boolean
          name?: string
          owner_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "collections_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_message_at: string
          listing_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string
          listing_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string
          listing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "card_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_rates: {
        Row: {
          base: Database["public"]["Enums"]["currency_code"]
          fetched_at: string
          quote: Database["public"]["Enums"]["currency_code"]
          rate: number
        }
        Insert: {
          base: Database["public"]["Enums"]["currency_code"]
          fetched_at?: string
          quote: Database["public"]["Enums"]["currency_code"]
          rate: number
        }
        Update: {
          base?: Database["public"]["Enums"]["currency_code"]
          fetched_at?: string
          quote?: Database["public"]["Enums"]["currency_code"]
          rate?: number
        }
        Relationships: []
      }
      listing_views_daily: {
        Row: {
          day: string
          listing_id: string
          viewer_key: string
        }
        Insert: {
          day?: string
          listing_id: string
          viewer_key: string
        }
        Update: {
          day?: string
          listing_id?: string
          viewer_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_views_daily_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "card_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: number
          image_path: string | null
          kind: Database["public"]["Enums"]["message_kind"]
          listing_id: string | null
          sender_id: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: never
          image_path?: string | null
          kind?: Database["public"]["Enums"]["message_kind"]
          listing_id?: string | null
          sender_id?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: never
          image_path?: string | null
          kind?: Database["public"]["Enums"]["message_kind"]
          listing_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "card_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          note: string | null
          report_id: string | null
          target_listing_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          report_id?: string | null
          target_listing_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          report_id?: string | null
          target_listing_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_target_listing_id_fkey"
            columns: ["target_listing_id"]
            isOneToOne: false
            referencedRelation: "card_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pokemon_cards: {
        Row: {
          card_number: string
          dex_ids: number[]
          external_id: string
          external_source: string
          hp: number | null
          id: string
          image_large_url: string | null
          image_small_url: string | null
          language: string
          name: string
          pokemon_name: string | null
          printed_total: number | null
          printing: string[]
          rarity: string | null
          release_date: string | null
          set_code: string
          set_name: string
          type: string | null
          updated_at: string
        }
        Insert: {
          card_number: string
          dex_ids?: number[]
          external_id: string
          external_source?: string
          hp?: number | null
          id?: string
          image_large_url?: string | null
          image_small_url?: string | null
          language: string
          name: string
          pokemon_name?: string | null
          printed_total?: number | null
          printing?: string[]
          rarity?: string | null
          release_date?: string | null
          set_code: string
          set_name: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          card_number?: string
          dex_ids?: number[]
          external_id?: string
          external_source?: string
          hp?: number | null
          id?: string
          image_large_url?: string | null
          image_small_url?: string | null
          language?: string
          name?: string
          pokemon_name?: string | null
          printed_total?: number | null
          printing?: string[]
          rarity?: string | null
          release_date?: string | null
          set_code?: string
          set_name?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pokemon_species: {
        Row: {
          dex_id: number
          name_en: string
        }
        Insert: {
          dex_id: number
          name_en: string
        }
        Update: {
          dex_id?: number
          name_en?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          location_city: string | null
          preferred_currency: Database["public"]["Enums"]["currency_code"]
          preferred_locale: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["account_status"]
          terms_accepted_at: string | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          location_city?: string | null
          preferred_currency?: Database["public"]["Enums"]["currency_code"]
          preferred_locale?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["account_status"]
          terms_accepted_at?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location_city?: string | null
          preferred_currency?: Database["public"]["Enums"]["currency_code"]
          preferred_locale?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["account_status"]
          terms_accepted_at?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_listing_id: string | null
          target_snapshot: Json | null
          target_user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_listing_id?: string | null
          target_snapshot?: Json | null
          target_user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_listing_id?: string | null
          target_snapshot?: Json | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_listing_id_fkey"
            columns: ["target_listing_id"]
            isOneToOne: false
            referencedRelation: "card_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          card_id: string
          created_at: string
          id: string
          max_price: number | null
          max_price_currency: Database["public"]["Enums"]["currency_code"]
          min_condition: Database["public"]["Enums"]["card_condition"] | null
          notes: string | null
          owner_id: string
          printing: string | null
          priority: Database["public"]["Enums"]["wishlist_priority"]
          quantity: number
          wishlist_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          max_price?: number | null
          max_price_currency?: Database["public"]["Enums"]["currency_code"]
          min_condition?: Database["public"]["Enums"]["card_condition"] | null
          notes?: string | null
          owner_id: string
          printing?: string | null
          priority?: Database["public"]["Enums"]["wishlist_priority"]
          quantity?: number
          wishlist_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          max_price?: number | null
          max_price_currency?: Database["public"]["Enums"]["currency_code"]
          min_condition?: Database["public"]["Enums"]["card_condition"] | null
          notes?: string | null
          owner_id?: string
          printing?: string | null
          priority?: Database["public"]["Enums"]["wishlist_priority"]
          quantity?: number
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "pokemon_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          is_public: boolean
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          is_public?: boolean
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          is_public?: boolean
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_resolve_report: {
        Args: {
          p_note?: string
          p_report: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: undefined
      }
      admin_set_listing_moderation: {
        Args: {
          p_listing: string
          p_note?: string
          p_status: Database["public"]["Enums"]["moderation_status"]
        }
        Returns: undefined
      }
      admin_set_user_status: {
        Args: {
          p_note?: string
          p_status: Database["public"]["Enums"]["account_status"]
          p_user: string
        }
        Returns: undefined
      }
      card_haystack: {
        Args: {
          p_name: string
          p_number: string
          p_pokemon: string
          p_set_code: string
          p_set_name: string
        }
        Returns: string
      }
      collection_stats: {
        Args: { p_currency?: Database["public"]["Enums"]["currency_code"] }
        Returns: {
          estimated_value: number
          listed_for_sale: number
          listed_for_trade: number
          sets: number
          total_cards: number
          unique_cards: number
          wishlist_count: number
        }[]
      }
      condition_rank: {
        Args: { c: Database["public"]["Enums"]["card_condition"] }
        Returns: number
      }
      conversation_has_block: {
        Args: { p_conversation: string }
        Returns: boolean
      }
      convert_amount: {
        Args: {
          p_amount: number
          p_from: Database["public"]["Enums"]["currency_code"]
          p_to: Database["public"]["Enums"]["currency_code"]
        }
        Returns: number
      }
      delete_collection: { Args: { p_collection: string }; Returns: undefined }
      inbox: {
        Args: { p_limit?: number }
        Returns: {
          conversation_id: string
          is_blocked: boolean
          last_body: string
          last_kind: Database["public"]["Enums"]["message_kind"]
          last_message_at: string
          last_sender_id: string
          other_avatar_url: string
          other_display_name: string
          other_user_id: string
          other_username: string
          unread_count: number
        }[]
      }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean }
      is_blocked_with: { Args: { p_other: string }; Returns: boolean }
      is_conversation_member: {
        Args: { p_conversation: string }
        Returns: boolean
      }
      is_conversation_member_text: {
        Args: { p_conversation: string }
        Returns: boolean
      }
      is_user_active: { Args: { p_user: string }; Returns: boolean }
      is_username_available: { Args: { p_username: string }; Returns: boolean }
      like_escape: { Args: { t: string }; Returns: string }
      mark_conversation_read: {
        Args: { p_conversation: string }
        Returns: undefined
      }
      marketplace_facets: { Args: never; Returns: Json }
      public_profile: {
        Args: { p_username: string }
        Returns: {
          avatar_url: string
          bio: string
          collection_size: number
          created_at: string
          display_name: string
          id: string
          is_blocked_by_me: boolean
          listed_count: number
          location_city: string
          username: string
          wishlist_count: number
        }[]
      }
      record_listing_view: { Args: { p_listing: string }; Returns: undefined }
      reorder_collection_items: {
        Args: { p_collection: string; p_item_ids: string[] }
        Returns: undefined
      }
      search_catalog: {
        Args: { p_language?: string; p_limit?: number; p_q: string }
        Returns: {
          card_number: string
          dex_ids: number[]
          external_id: string
          external_source: string
          hp: number | null
          id: string
          image_large_url: string | null
          image_small_url: string | null
          language: string
          name: string
          pokemon_name: string | null
          printed_total: number | null
          printing: string[]
          rarity: string | null
          release_date: string | null
          set_code: string
          set_name: string
          type: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "pokemon_cards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_listings: {
        Args: {
          p_card_id?: string
          p_city?: string
          p_conditions?: Database["public"]["Enums"]["card_condition"][]
          p_currency?: Database["public"]["Enums"]["currency_code"]
          p_languages?: string[]
          p_limit?: number
          p_max?: number
          p_min?: number
          p_offset?: number
          p_printings?: string[]
          p_q?: string
          p_rarities?: string[]
          p_seller?: string
          p_set_codes?: string[]
          p_sort?: string
          p_types?: Database["public"]["Enums"]["listing_type"][]
        }
        Returns: {
          card_id: string
          card_image_small: string
          card_language: string
          card_name: string
          card_number: string
          condition: Database["public"]["Enums"]["card_condition"]
          conversation_count: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          grade: number
          grading_company: string
          listing_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          looking_for: string[]
          medium_path: string
          pokemon_name: string
          price: number
          price_converted: number
          printed_total: number
          printing: string
          quantity: number
          rarity: string
          seller_avatar_url: string
          seller_city: string
          seller_display_name: string
          seller_id: string
          seller_since: string
          seller_username: string
          set_code: string
          set_name: string
          thumb_path: string
          view_count: number
        }[]
      }
      search_normalize: { Args: { t: string }; Returns: string }
      start_conversation: {
        Args: { p_listing?: string; p_other: string }
        Returns: string
      }
      wishlist_availability: {
        Args: never
        Returns: {
          available_count: number
          wishlist_item_id: string
        }[]
      }
    }
    Enums: {
      account_status: "ACTIVE" | "SUSPENDED"
      card_condition:
        | "MINT"
        | "NEAR_MINT"
        | "EXCELLENT"
        | "LIGHT_PLAYED"
        | "PLAYED"
        | "POOR"
      currency_code: "VND" | "USD"
      listing_type: "SALE" | "TRADE" | "SALE_OR_TRADE"
      message_kind: "TEXT" | "LISTING" | "IMAGE"
      moderation_status: "VISIBLE" | "HIDDEN_PENDING_REVIEW" | "REMOVED"
      report_reason:
        | "SCAM_SUSPICION"
        | "HARASSMENT"
        | "SPAM"
        | "FAKE_LISTING"
        | "MISLEADING_CONDITION"
        | "PROHIBITED_CONTENT"
        | "FAKE_CARD"
        | "WRONG_PRICE"
        | "WRONG_CARD_INFO"
        | "MISLEADING_PHOTOS"
        | "OTHER"
      report_status: "OPEN" | "RESOLVED" | "DISMISSED"
      user_role: "USER" | "ADMIN"
      wishlist_priority: "HIGH" | "MEDIUM" | "LOW"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["ACTIVE", "SUSPENDED"],
      card_condition: [
        "MINT",
        "NEAR_MINT",
        "EXCELLENT",
        "LIGHT_PLAYED",
        "PLAYED",
        "POOR",
      ],
      currency_code: ["VND", "USD"],
      listing_type: ["SALE", "TRADE", "SALE_OR_TRADE"],
      message_kind: ["TEXT", "LISTING", "IMAGE"],
      moderation_status: ["VISIBLE", "HIDDEN_PENDING_REVIEW", "REMOVED"],
      report_reason: [
        "SCAM_SUSPICION",
        "HARASSMENT",
        "SPAM",
        "FAKE_LISTING",
        "MISLEADING_CONDITION",
        "PROHIBITED_CONTENT",
        "FAKE_CARD",
        "WRONG_PRICE",
        "WRONG_CARD_INFO",
        "MISLEADING_PHOTOS",
        "OTHER",
      ],
      report_status: ["OPEN", "RESOLVED", "DISMISSED"],
      user_role: ["USER", "ADMIN"],
      wishlist_priority: ["HIGH", "MEDIUM", "LOW"],
    },
  },
} as const

