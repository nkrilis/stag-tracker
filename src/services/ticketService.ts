import { supabase, TicketRow, TicketInput, getCurrentUserEmail } from '../config/supabase';

const yn = (v: boolean): 'Yes' | 'No' => (v ? 'Yes' : 'No');

const pad = (t: string): string => t.trim().padStart(3, '0');

// Row layout (legacy positional shape kept for existing consumers):
//   0 ticket_number | 1 name | 2 phone | 3 paid | 4 checked_in | 5 expected
//   6 created_by    | 7 paid_by | 8 checked_in_by
const rowToArray = (r: TicketRow): string[] => [
  r.ticket_number,
  r.name,
  r.phone_number,
  yn(r.paid),
  yn(r.checked_in),
  yn(r.expected),
  r.created_by ?? '',
  r.paid_by ?? '',
  r.checked_in_by ?? '',
];

const rowToFlat = (r: TicketRow) => ({
  ticketNumber: r.ticket_number,
  name: r.name,
  phoneNumber: r.phone_number,
  paid: yn(r.paid),
  checkedIn: yn(r.checked_in),
  expected: yn(r.expected),
  createdBy: r.created_by ?? '',
  paidBy: r.paid_by ?? '',
  checkedInBy: r.checked_in_by ?? '',
});

export class TicketService {
  /**
   * Fetch all tickets in array-of-arrays form (legacy shape).
   * Order: ticketNumber, name, phoneNumber, paid, checkedIn, expected.
   */
  async getRows(): Promise<string[][]> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('ticket_number', { ascending: true });

    if (error) {
      console.error('getRows failed:', error);
      throw error;
    }

    return (data ?? []).map(rowToArray);
  }

  async searchTicket(ticketNumber: string) {
    const normalized = pad(ticketNumber);
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_number', normalized)
      .maybeSingle();

    if (error) {
      console.error('searchTicket failed:', error);
      return { found: false } as const;
    }

    if (!data) return { found: false } as const;
    return { found: true, data: rowToFlat(data as TicketRow) };
  }

  async ticketExists(ticketNumber: string): Promise<boolean> {
    const result = await this.searchTicket(ticketNumber);
    return result.found;
  }

  async searchTicketsByGroup(phoneNumber: string, name: string) {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('name', name);

    if (error) {
      console.error('searchTicketsByGroup failed:', error);
      return { success: false, tickets: [] as ReturnType<typeof rowToFlat>[] };
    }

    return {
      success: true,
      tickets: (data ?? []).map((r) => rowToFlat(r as TicketRow)),
    };
  }

  async checkMultipleTickets(ticketNumbers: string[]): Promise<string[]> {
    if (ticketNumbers.length === 0) return [];
    const normalized = ticketNumbers.map(pad);
    const { data, error } = await supabase
      .from('tickets')
      .select('ticket_number')
      .in('ticket_number', normalized);

    if (error) {
      console.error('checkMultipleTickets failed:', error);
      return [];
    }

    return (data ?? []).map((r) => r.ticket_number);
  }

  async appendMultipleTickets(
    tickets: TicketInput[]
  ): Promise<{ success: number; failed: string[] }> {
    if (tickets.length === 0) return { success: 0, failed: [] };

    const now = new Date().toISOString();
    const actor = getCurrentUserEmail();
    const rows = tickets.map((t) => ({
      ticket_number: pad(t.ticketNumber),
      name: t.name,
      phone_number: t.phoneNumber,
      paid: t.paid,
      checked_in: t.checkedIn,
      expected: t.expected,
      paid_at: t.paid ? now : null,
      checked_in_at: t.checkedIn ? now : null,
      created_by: actor,
      paid_by: t.paid ? actor : null,
      checked_in_by: t.checkedIn ? actor : null,
    }));

    const { data, error } = await supabase
      .from('tickets')
      .insert(rows)
      .select('ticket_number');

    if (error) {
      console.error('appendMultipleTickets failed:', error);
      // On a batch failure, treat the whole batch as failed.
      return { success: 0, failed: rows.map((r) => r.ticket_number) };
    }

    const insertedNumbers = new Set((data ?? []).map((r) => r.ticket_number));
    const failed = rows
      .map((r) => r.ticket_number)
      .filter((n) => !insertedNumbers.has(n));

    return { success: insertedNumbers.size, failed };
  }

  async appendTicket(t: TicketInput): Promise<boolean> {
    const result = await this.appendMultipleTickets([t]);
    if (result.success !== 1) {
      throw new Error(`Failed to add ticket ${t.ticketNumber}`);
    }
    return true;
  }

  async markAsPaid(ticketNumber: string): Promise<boolean> {
    const { error } = await supabase
      .from('tickets')
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        paid_by: getCurrentUserEmail(),
      })
      .eq('ticket_number', pad(ticketNumber));

    if (error) {
      console.error('markAsPaid failed:', error);
      throw error;
    }
    return true;
  }

  async markAsUnpaid(ticketNumber: string): Promise<boolean> {
    const { error } = await supabase
      .from('tickets')
      .update({ paid: false, paid_at: null, paid_by: null })
      .eq('ticket_number', pad(ticketNumber));

    if (error) {
      console.error('markAsUnpaid failed:', error);
      throw error;
    }
    return true;
  }

  /** Toggle/set payment status (alias kept for legacy callers). */
  async updatePaymentStatus(ticketNumber: string): Promise<boolean> {
    return this.markAsPaid(ticketNumber);
  }

  async checkInTicket(ticketNumber: string): Promise<boolean> {
    const { error } = await supabase
      .from('tickets')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: getCurrentUserEmail(),
      })
      .eq('ticket_number', pad(ticketNumber));

    if (error) {
      console.error('checkInTicket failed:', error);
      throw error;
    }
    return true;
  }

  async payAndCheckIn(ticketNumber: string): Promise<boolean> {
    const now = new Date().toISOString();
    const actor = getCurrentUserEmail();
    const { error } = await supabase
      .from('tickets')
      .update({
        paid: true,
        paid_at: now,
        paid_by: actor,
        checked_in: true,
        checked_in_at: now,
        checked_in_by: actor,
      })
      .eq('ticket_number', pad(ticketNumber));

    if (error) {
      console.error('payAndCheckIn failed:', error);
      throw error;
    }
    return true;
  }

  /** Admin: fetch all tickets as full rows (with audit columns). */
  async getAllTickets(): Promise<TicketRow[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('ticket_number', { ascending: true });
    if (error) {
      console.error('getAllTickets failed:', error);
      throw error;
    }
    return (data ?? []) as TicketRow[];
  }

  /**
   * Admin: update editable fields on a ticket. Audit `*_by` / `*_at` columns
   * are refreshed to reflect the acting admin whenever paid / checked_in flip.
   */
  async updateTicket(
    ticketNumber: string,
    updates: {
      name?: string;
      phoneNumber?: string;
      paid?: boolean;
      checkedIn?: boolean;
      expected?: boolean;
    }
  ): Promise<TicketRow> {
    const normalized = pad(ticketNumber);
    const actor = getCurrentUserEmail();
    const now = new Date().toISOString();

    // Fetch current row so we only touch audit columns on state changes.
    const { data: existing, error: fetchErr } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_number', normalized)
      .maybeSingle();
    if (fetchErr) {
      console.error('updateTicket fetch failed:', fetchErr);
      throw fetchErr;
    }
    if (!existing) {
      throw new Error(`Ticket #${normalized} not found`);
    }
    const current = existing as TicketRow;

    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name.trim();
    if (updates.phoneNumber !== undefined) patch.phone_number = updates.phoneNumber.trim();
    if (updates.expected !== undefined) patch.expected = updates.expected;

    if (updates.paid !== undefined && updates.paid !== current.paid) {
      patch.paid = updates.paid;
      patch.paid_at = updates.paid ? now : null;
      patch.paid_by = updates.paid ? actor : null;
    }
    if (updates.checkedIn !== undefined && updates.checkedIn !== current.checked_in) {
      patch.checked_in = updates.checkedIn;
      patch.checked_in_at = updates.checkedIn ? now : null;
      patch.checked_in_by = updates.checkedIn ? actor : null;
    }

    if (Object.keys(patch).length === 0) {
      return current;
    }

    const { data, error } = await supabase
      .from('tickets')
      .update(patch)
      .eq('ticket_number', normalized)
      .select()
      .single();
    if (error) {
      console.error('updateTicket failed:', error);
      throw error;
    }
    return data as TicketRow;
  }

  /** Admin: permanently delete a ticket. */
  async deleteTicket(ticketNumber: string): Promise<boolean> {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('ticket_number', pad(ticketNumber));
    if (error) {
      console.error('deleteTicket failed:', error);
      throw error;
    }
    return true;
  }

  /**
   * Admin: aggregate tickets by the staff member who entered them (created_by)
   * to work out how many each seller has sold and what balance to collect.
   */
  async getSellerSummaries(ticketPrice: number): Promise<SellerSummary[]> {
    const rows = await this.getAllTickets();

    const bySeller = new Map<string, SellerSummary>();
    for (const r of rows) {
      const seller = r.created_by?.trim() || 'Unknown';
      let s = bySeller.get(seller);
      if (!s) {
        s = {
          seller,
          totalSold: 0,
          paidCount: 0,
          unpaidCount: 0,
          collected: 0,
          outstanding: 0,
          totalValue: 0,
        };
        bySeller.set(seller, s);
      }
      s.totalSold += 1;
      if (r.paid) {
        s.paidCount += 1;
        s.collected += ticketPrice;
      } else {
        s.unpaidCount += 1;
        s.outstanding += ticketPrice;
      }
      s.totalValue += ticketPrice;
    }

    return Array.from(bySeller.values()).sort((a, b) =>
      a.seller.localeCompare(b.seller)
    );
  }
}

export interface SellerSummary {
  seller: string;
  totalSold: number;
  paidCount: number;
  unpaidCount: number;
  /** Cash the seller has collected from buyers (paid tickets × price). */
  collected: number;
  /** Value of tickets sold but not yet paid (unpaid × price). */
  outstanding: number;
  totalValue: number;
}

export const ticketService = new TicketService();
