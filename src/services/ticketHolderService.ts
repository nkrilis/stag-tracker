import { supabase, getCurrentUserEmail } from '../config/supabase';

export interface TicketHolder {
  id: string;
  holder_email: string;
  range_start: string;
  range_end: string;
  notes: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketHolderInput {
  holderEmail: string;
  rangeStart: string;
  rangeEnd: string;
  notes?: string;
}

const pad = (t: string): string => t.trim().padStart(3, '0');

export const ticketHolderService = {
  async list(): Promise<TicketHolder[]> {
    const { data, error } = await supabase
      .from('ticket_holders')
      .select('*')
      .order('range_start', { ascending: true });
    if (error) {
      console.error('list ticket_holders error:', error);
      return [];
    }
    return (data ?? []) as TicketHolder[];
  },

  async create(input: TicketHolderInput): Promise<TicketHolder | null> {
    const start = pad(input.rangeStart);
    const end = pad(input.rangeEnd);
    if (start > end) {
      throw new Error('Range start must be less than or equal to range end.');
    }

    const { data, error } = await supabase
      .from('ticket_holders')
      .insert({
        holder_email: input.holderEmail.trim().toLowerCase(),
        range_start: start,
        range_end: end,
        notes: input.notes?.trim() || null,
        assigned_by: getCurrentUserEmail(),
      })
      .select()
      .single();

    if (error) {
      console.error('create ticket_holder error:', error);
      throw error;
    }
    return data as TicketHolder;
  },

  async update(id: string, input: TicketHolderInput): Promise<TicketHolder | null> {
    const start = pad(input.rangeStart);
    const end = pad(input.rangeEnd);
    if (start > end) {
      throw new Error('Range start must be less than or equal to range end.');
    }

    const { data, error } = await supabase
      .from('ticket_holders')
      .update({
        holder_email: input.holderEmail.trim().toLowerCase(),
        range_start: start,
        range_end: end,
        notes: input.notes?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('update ticket_holder error:', error);
      throw error;
    }
    return data as TicketHolder;
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase.from('ticket_holders').delete().eq('id', id);
    if (error) {
      console.error('delete ticket_holder error:', error);
      return false;
    }
    return true;
  },
};
