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
          role: 'kunde' | 'anbieter' | 'b2b' | 'admin' | 'super_admin'
          is_active: boolean
          preferred_language: 'de' | 'en' | 'tr'
          onboarding_done: boolean
          referral_code: string | null
          referral_balance_cents: number
          stripe_customer_id: string | null
          delete_requested_at: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'kunde' | 'anbieter' | 'b2b' | 'admin' | 'super_admin'
          is_active?: boolean
          preferred_language?: 'de' | 'en' | 'tr'
          onboarding_done?: boolean
          referral_code?: string | null
          stripe_customer_id?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'kunde' | 'anbieter' | 'b2b' | 'admin' | 'super_admin'
          is_active?: boolean
          preferred_language?: 'de' | 'en' | 'tr'
          onboarding_done?: boolean
          stripe_customer_id?: string | null
          delete_requested_at?: string | null
          deleted_at?: string | null
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
          stripe_session_id: string | null
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | null
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
          stripe_session_id?: string | null
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | null
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
          reported_flag: boolean
          reported_at: string | null
          reported_by: string | null
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
        Update: Partial<Database['public']['Tables']['reviews']['Insert']> & {
          reply?: string | null
          replied_at?: string | null
          reported_flag?: boolean
          reported_at?: string | null
          reported_by?: string | null
        }
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
        Row: { id: string; user_id: string; booking_id: string | null; type: string; given: boolean; ip_hash: string | null; created_at: string }
        Insert: { id?: string; user_id: string; booking_id?: string | null; type: string; given?: boolean; ip_hash?: string | null }
        Update: Partial<Database['public']['Tables']['consents']['Insert']>
      }
      consent_logs: {
        Row: { id: string; user_id: string; type: string; version: string; ip_hash: string | null; metadata: Record<string, unknown> | null; created_at: string }
        Insert: { id?: string; user_id: string; type: string; version: string; ip_hash?: string | null; metadata?: Record<string, unknown> | null }
        Update: Partial<Database['public']['Tables']['consent_logs']['Insert']>
      }
      cookie_consents: {
        Row: { id: string; session_id: string; choices: Record<string, boolean> | null; ip_hash: string | null; created_at: string }
        Insert: { id?: string; session_id: string; choices?: Record<string, boolean> | null; ip_hash?: string | null }
        Update: Partial<Database['public']['Tables']['cookie_consents']['Insert']>
      }
      login_attempts: {
        Row: { id: string; ip: string; email: string; success: boolean; created_at: string }
        Insert: { id?: string; ip: string; email: string; success: boolean }
        Update: Partial<Database['public']['Tables']['login_attempts']['Insert']>
      }
      newsletter_subscribers: {
        Row: { id: string; email: string; source: string | null; created_at: string }
        Insert: { id?: string; email: string; source?: string | null }
        Update: Partial<Database['public']['Tables']['newsletter_subscribers']['Insert']>
      }
      categories: {
        Row: { id: string; slug: string; name: string; icon_url: string | null; sort_order: number; is_active: boolean; created_at: string }
        Insert: { id?: string; slug: string; name: string; icon_url?: string | null; sort_order?: number; is_active?: boolean }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      promo_codes: {
        Row: { id: string; code: string; discount_percent: number | null; discount_fixed_cents: number | null; valid_from: string | null; valid_until: string | null; max_uses: number | null; current_uses: number; is_active: boolean; created_at: string }
        Insert: { id?: string; code: string; discount_percent?: number | null; discount_fixed_cents?: number | null; valid_from?: string | null; valid_until?: string | null; max_uses?: number | null; is_active?: boolean }
        Update: Partial<Database['public']['Tables']['promo_codes']['Insert']>
      }
      booking_policies: {
        Row: { id: string; salon_id: string; min_cancel_hours: number; free_cancel_hours: number; created_at: string }
        Insert: { id?: string; salon_id: string; min_cancel_hours?: number; free_cancel_hours?: number }
        Update: Partial<Database['public']['Tables']['booking_policies']['Insert']>
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
      compliance_documents: {
        Row: { id: string; salon_id: string; document_type: string; file_url: string | null; file_name: string | null; status: string; expires_at: string | null; uploaded_by: string | null; reviewer_notes: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; salon_id: string; document_type: string; file_url?: string | null; file_name?: string | null; status?: string; expires_at?: string | null; uploaded_by?: string | null; reviewer_notes?: string | null; reviewed_by?: string | null; reviewed_at?: string | null }
        Update: Partial<Database['public']['Tables']['compliance_documents']['Insert']>
      }
      // ═══ Marketplace Tables ═══
      product_categories: {
        Row: { id: string; slug: string; name: string; parent_slug: string | null; target: 'b2c' | 'b2b' | 'both'; icon_url: string | null; sort_order: number; is_active: boolean; created_at: string }
        Insert: { id?: string; slug: string; name: string; parent_slug?: string | null; target?: 'b2c' | 'b2b' | 'both'; icon_url?: string | null; sort_order?: number; is_active?: boolean }
        Update: Partial<Database['public']['Tables']['product_categories']['Insert']>
      }
      sellers: {
        Row: { id: string; user_id: string; salon_id: string | null; seller_type: 'salon' | 'grosshaendler' | 'affiliate'; company_name: string | null; description: string | null; logo_url: string | null; is_verified: boolean; is_active: boolean; commission_rate_override: number | null; stripe_connect_id: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; salon_id?: string | null; seller_type: 'salon' | 'grosshaendler' | 'affiliate'; company_name?: string | null; description?: string | null; logo_url?: string | null; is_verified?: boolean; is_active?: boolean; commission_rate_override?: number | null; stripe_connect_id?: string | null }
        Update: Partial<Database['public']['Tables']['sellers']['Insert']>
      }
      products: {
        Row: { id: string; seller_id: string; salon_id: string | null; category_id: string | null; name: string; slug: string; description: string | null; price_cents: number; compare_at_price_cents: number | null; currency: string; sku: string | null; barcode: string | null; weight_grams: number | null; stock_quantity: number; is_unlimited_stock: boolean; images: unknown[]; target: 'b2c' | 'b2b' | 'both'; is_active: boolean; is_featured: boolean; brand: string | null; tags: string[]; affiliate_url: string | null; affiliate_source: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; seller_id: string; salon_id?: string | null; category_id?: string | null; name: string; slug: string; description?: string | null; price_cents: number; compare_at_price_cents?: number | null; currency?: string; sku?: string | null; barcode?: string | null; weight_grams?: number | null; stock_quantity?: number; is_unlimited_stock?: boolean; images?: unknown[]; target?: 'b2c' | 'b2b' | 'both'; is_active?: boolean; is_featured?: boolean; brand?: string | null; tags?: string[]; affiliate_url?: string | null; affiliate_source?: string | null }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      product_variants: {
        Row: { id: string; product_id: string; name: string; price_cents: number; sku: string | null; stock_quantity: number; sort_order: number; is_active: boolean; created_at: string }
        Insert: { id?: string; product_id: string; name: string; price_cents: number; sku?: string | null; stock_quantity?: number; sort_order?: number; is_active?: boolean }
        Update: Partial<Database['public']['Tables']['product_variants']['Insert']>
      }
      cart_items: {
        Row: { id: string; customer_id: string; product_id: string; variant_id: string | null; quantity: number; created_at: string; updated_at: string }
        Insert: { id?: string; customer_id: string; product_id: string; variant_id?: string | null; quantity?: number }
        Update: Partial<Database['public']['Tables']['cart_items']['Insert']>
      }
      orders: {
        Row: { id: string; order_number: string; customer_id: string; status: string; subtotal_cents: number; shipping_cents: number; tax_cents: number; total_cents: number; currency: string; shipping_name: string | null; shipping_street: string | null; shipping_city: string | null; shipping_postal_code: string | null; shipping_country: string; stripe_session_id: string | null; stripe_payment_intent: string | null; payment_status: string; notes: string | null; tracking_number: string | null; tracking_url: string | null; shipped_at: string | null; delivered_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; order_number: string; customer_id: string; status?: string; subtotal_cents: number; shipping_cents?: number; tax_cents?: number; total_cents: number; currency?: string; shipping_name?: string | null; shipping_street?: string | null; shipping_city?: string | null; shipping_postal_code?: string | null; stripe_session_id?: string | null; stripe_payment_intent?: string | null; payment_status?: string; notes?: string | null }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      order_items: {
        Row: { id: string; order_id: string; product_id: string; variant_id: string | null; seller_id: string; quantity: number; unit_price_cents: number; total_cents: number; fulfillment_status: string; created_at: string }
        Insert: { id?: string; order_id: string; product_id: string; variant_id?: string | null; seller_id: string; quantity: number; unit_price_cents: number; total_cents: number; fulfillment_status?: string }
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
      }
      commissions: {
        Row: { id: string; type: string; source_type: string; source_id: string; beneficiary_type: string; beneficiary_id: string | null; rate_percent: number; base_amount_cents: number; commission_cents: number; currency: string; status: string; paid_out_at: string | null; created_at: string }
        Insert: { id?: string; type: string; source_type: string; source_id: string; beneficiary_type: string; beneficiary_id?: string | null; rate_percent: number; base_amount_cents: number; commission_cents: number; currency?: string; status?: string }
        Update: Partial<Database['public']['Tables']['commissions']['Insert']>
      }
      commission_rates: {
        Row: { id: string; type: string; rate_percent: number; min_rate_percent: number | null; max_rate_percent: number | null; effective_from: string; created_at: string }
        Insert: { id?: string; type: string; rate_percent: number; min_rate_percent?: number | null; max_rate_percent?: number | null }
        Update: Partial<Database['public']['Tables']['commission_rates']['Insert']>
      }
      product_recommendations: {
        Row: { id: string; booking_id: string; salon_id: string; staff_id: string | null; product_id: string; customer_id: string; message: string | null; is_viewed: boolean; is_purchased: boolean; purchased_order_item_id: string | null; created_at: string }
        Insert: { id?: string; booking_id: string; salon_id: string; staff_id?: string | null; product_id: string; customer_id: string; message?: string | null }
        Update: Partial<Database['public']['Tables']['product_recommendations']['Insert']> & { is_viewed?: boolean; is_purchased?: boolean; purchased_order_item_id?: string | null }
      }
      customer_salon_history: {
        Row: { customer_id: string; salon_id: string; first_booking_id: string | null; first_booking_date: string; total_bookings: number; last_booking_date: string }
        Insert: { customer_id: string; salon_id: string; first_booking_id?: string | null; first_booking_date?: string; total_bookings?: number; last_booking_date?: string }
        Update: Partial<Database['public']['Tables']['customer_salon_history']['Insert']>
      }
    }
  }
}
