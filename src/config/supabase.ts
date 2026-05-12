import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'In local dev, copy .env.example to .env. In CI, add them as repository secrets.'
  );
}

// Fall back to a syntactically valid placeholder URL so createClient does not
// throw at module-load time when env vars are missing (keeps the React tree
// rendering so the user sees an error message instead of a blank page).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
    },
  }
);

export const SUPABASE_CONFIGURED = Boolean(supabaseUrl && supabaseAnonKey);

export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? '').toLowerCase();

// Cache the signed-in user's email so synchronous callers (e.g. write paths
// in the ticket service) can stamp audit columns without an extra round trip.
let currentUserEmail: string | null = null;

export const getCurrentUserEmail = (): string | null => currentUserEmail;

void supabase.auth.getSession().then(({ data }) => {
  currentUserEmail = data.session?.user.email?.toLowerCase() ?? null;
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentUserEmail = session?.user.email?.toLowerCase() ?? null;
});

export interface TicketRow {
  ticket_number: string;
  name: string;
  phone_number: string;
  paid: boolean;
  checked_in: boolean;
  expected: boolean;
  paid_at: string | null;
  checked_in_at: string | null;
  created_by: string | null;
  paid_by: string | null;
  checked_in_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketInput {
  ticketNumber: string;
  name: string;
  phoneNumber: string;
  paid: boolean;
  checkedIn: boolean;
  expected: boolean;
}
