import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      // supabase-js defaults to the implicit flow, which hands the session back
      // in the URL fragment — so signing in with Google landed you on a page
      // whose address was a wall of #access_token=…&refresh_token=…&expires_at=…
      // The access and refresh tokens were sitting in the address bar, in
      // browser history and in anything the user might copy or share.
      //
      // PKCE returns a single short-lived ?code= instead, which the client
      // exchanges for the session and then strips from the URL itself.
      flowType: 'pkce',
    },
  }
)
