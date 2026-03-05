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
    }
  }
}
