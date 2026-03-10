export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          role: 'kunde' | 'anbieter' | 'admin' | 'super_admin'
          is_active: boolean
          preferred_language: 'de' | 'en' | 'tr'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'kunde' | 'anbieter' | 'admin' | 'super_admin'
          is_active?: boolean
          preferred_language?: 'de' | 'en' | 'tr'
        }
        Update: {
          email?: string | null
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'kunde' | 'anbieter' | 'admin' | 'super_admin'
          is_active?: boolean
          preferred_language?: 'de' | 'en' | 'tr'
        }
      }
      salons: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string | null
          category: string
          description: string | null
          phone: string | null
          email: string | null
          website: string | null
          street: string | null
          house_number: string | null
          postal_code: string | null
          city: string | null
          state: string
          opening_hours: Record<string, string | null> | null
          logo_url: string | null
          cover_url: string | null
          gallery: unknown[]
          avg_rating: number
          review_count: number
          is_verified: boolean
          is_active: boolean
          subscription_tier: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          slug?: string | null
          category: string
          description?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          street?: string | null
          house_number?: string | null
          postal_code?: string | null
          city?: string | null
          state?: string
          opening_hours?: Record<string, string | null> | null
          logo_url?: string | null
          cover_url?: string | null
          gallery?: unknown[]
          avg_rating?: number
          review_count?: number
          is_verified?: boolean
          is_active?: boolean
          subscription_tier?: string
        }
        Update: Partial<Database['public']['Tables']['salons']['Insert']>
      }
      services: {
        Row: {
          id: string
          salon_id: string
          name: string
          description: string | null
          category: string | null
          duration_minutes: number
          price_cents: number
          currency: string
          is_active: boolean
          sort_order: number
          risk_level: string | null
          created_at: string
        }
        Insert: {
          id?: string
          salon_id: string
          name: string
          description?: string | null
          category?: string | null
          duration_minutes?: number
          price_cents: number
          currency?: string
          is_active?: boolean
          sort_order?: number
          risk_level?: string | null
        }
        Update: Partial<Database['public']['Tables']['services']['Insert']>
      }
      staff: {
        Row: {
          id: string
          salon_id: string
          user_id: string | null
          name: string
          title: string | null
          avatar_url: string | null
          specialties: string[]
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          salon_id: string
          user_id?: string | null
          name: string
          title?: string | null
          avatar_url?: string | null
          specialties?: string[]
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['staff']['Insert']>
      }
      bookings: {
        Row: {
          id: string
          customer_id: string
          salon_id: string
          service_id: string
          staff_id: string | null
          booking_date: string
          start_time: string
          end_time: string
          status: string
          price_cents: number
          notes: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          salon_id: string
          service_id: string
          staff_id?: string | null
          booking_date: string
          start_time: string
          end_time: string
          status?: string
          price_cents: number
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
      }
      reviews: {
        Row: {
          id: string
          customer_id: string
          salon_id: string
          booking_id: string | null
          rating: number
          comment: string | null
          reply: string | null
          replied_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          salon_id: string
          booking_id?: string | null
          rating: number
          comment?: string | null
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
      }
      favorites: {
        Row: {
          id: string
          customer_id: string
          salon_id: string
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          salon_id: string
        }
        Update: Partial<Database['public']['Tables']['favorites']['Insert']>
      }
      offers: {
        Row: {
          id: string
          salon_id: string
          title: string
          description: string | null
          discount_percent: number | null
          discount_fixed_cents: number | null
          valid_from: string
          valid_until: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          salon_id: string
          title: string
          description?: string | null
          discount_percent?: number | null
          discount_fixed_cents?: number | null
          valid_from?: string
          valid_until?: string | null
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['offers']['Insert']>
      }
      rental_equipment: {
        Row: {
          id: string
          salon_id: string
          type: string
          name: string
          description: string | null
          price_per_day_cents: number
          price_per_month_cents: number | null
          is_available: boolean
          images: unknown[]
          created_at: string
        }
        Insert: {
          id?: string
          salon_id: string
          type: string
          name: string
          description?: string | null
          price_per_day_cents: number
          price_per_month_cents?: number | null
          is_available?: boolean
          images?: unknown[]
        }
        Update: Partial<Database['public']['Tables']['rental_equipment']['Insert']>
      }
      rental_bookings: {
        Row: {
          id: string
          equipment_id: string
          renter_id: string
          start_date: string
          end_date: string
          total_cents: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          equipment_id: string
          renter_id: string
          start_date: string
          end_date: string
          total_cents: number
          status?: string
        }
        Update: Partial<Database['public']['Tables']['rental_bookings']['Insert']>
      }
      loyalty_cards: {
        Row: {
          id: string
          customer_id: string
          salon_id: string
          stamps: number
          stamps_required: number
          reward: string
          is_redeemed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          salon_id: string
          stamps?: number
          stamps_required?: number
          reward?: string
          is_redeemed?: boolean
        }
        Update: Partial<Database['public']['Tables']['loyalty_cards']['Insert']>
      }
      onboarding_slides: {
        Row: {
          id: string
          sort_order: number
          title: string
          subtitle: string
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sort_order?: number
          title: string
          subtitle?: string
          image_url?: string | null
          is_active?: boolean
        }
        Update: {
          sort_order?: number
          title?: string
          subtitle?: string
          image_url?: string | null
          is_active?: boolean
        }
      }
      visit_logs: {
        Row: {
          id: string
          path: string
          ip: string | null
          country: string | null
          region: string | null
          city: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          path: string
          ip?: string | null
          country?: string | null
          region?: string | null
          city?: string | null
          user_agent?: string | null
        }
        Update: Partial<Database['public']['Tables']['visit_logs']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity: string
          entity_id: string
          details: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity: string
          entity_id: string
          details?: Record<string, unknown> | null
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
      documents: {
        Row: { id: string; owner_type: string; owner_id: string; doc_type: string; file_url: string | null; expiry_date: string | null; verified_status: string; version: number; created_at: string }
        Insert: { id?: string; owner_type: string; owner_id: string; doc_type: string; file_url?: string | null; expiry_date?: string | null; verified_status?: string; version?: number }
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
      }
      insurance_policies: {
        Row: { id: string; provider_user_id: string; plan_type: string; risk_level: string; status: string; valid_from: string; valid_until: string; pdf_url: string | null; created_at: string }
        Insert: { id?: string; provider_user_id: string; plan_type: string; risk_level: string; status?: string; valid_from: string; valid_until: string; pdf_url?: string | null }
        Update: Partial<Database['public']['Tables']['insurance_policies']['Insert']>
      }
      authorities_packs: {
        Row: { id: string; location_id: string; created_by: string | null; file_url: string | null; created_at: string }
        Insert: { id?: string; location_id: string; created_by?: string | null; file_url?: string | null }
        Update: Partial<Database['public']['Tables']['authorities_packs']['Insert']>
      }
      submission_tickets: {
        Row: { id: string; location_id: string; pack_id: string | null; plan_type: string; status: string; proof_file_url: string | null; admin_notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; location_id: string; pack_id?: string | null; plan_type: string; status?: string; proof_file_url?: string | null; admin_notes?: string | null }
        Update: Partial<Database['public']['Tables']['submission_tickets']['Insert']>
      }
      consents: {
        Row: { id: string; booking_id: string; signed_pdf_url: string | null; signed_at: string; checksum: string | null }
        Insert: { id?: string; booking_id: string; signed_pdf_url?: string | null; signed_at?: string; checksum?: string | null }
        Update: Partial<Database['public']['Tables']['consents']['Insert']>
      }
      protect_pricing: {
        Row: { id: string; risk_level: string; day_price_cents: number; month_price_cents: number; year_price_cents: number; currency: string; active: boolean; created_at: string }
        Insert: { id?: string; risk_level: string; day_price_cents: number; month_price_cents: number; year_price_cents: number; currency?: string; active?: boolean }
        Update: Partial<Database['public']['Tables']['protect_pricing']['Insert']>
      }
      compliance_plans: {
        Row: { id: string; plan_type: string; price_cents: number; included_submissions: number; min_term_months: number; extra_submission_price_cents: number; created_at: string }
        Insert: { id?: string; plan_type: string; price_cents: number; included_submissions?: number; min_term_months?: number; extra_submission_price_cents?: number }
        Update: Partial<Database['public']['Tables']['compliance_plans']['Insert']>
      }
    }
  }
}
