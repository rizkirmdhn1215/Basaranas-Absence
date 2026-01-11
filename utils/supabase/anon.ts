import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create an anon client that bypasses cookie issues
 * This is specifically for public operations like check-ins
 * that should work regardless of authentication state
 */
export function createAnonClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: false, // Don't persist session
                autoRefreshToken: false, // Don't auto refresh
            },
        }
    )
}
