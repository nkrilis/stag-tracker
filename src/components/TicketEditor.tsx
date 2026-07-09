import { useEffect, useMemo, useState, FormEvent } from 'react';
import { ticketService } from '../services/ticketService';
import { TicketRow } from '../config/supabase';
import './TicketEditor.css';

interface EditForm {
  name: string;
  phoneNumber: string;
  paid: boolean;
  checkedIn: boolean;
  expected: boolean;
}

const toForm = (t: TicketRow): EditForm => ({
  name: t.name,
  phoneNumber: t.phone_number,
  paid: t.paid,
  checkedIn: t.checked_in,
  expected: t.expected,
});

export function TicketEditor() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingNumber, setDeletingNumber] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setTickets(await ticketService.getAllTickets());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        t.ticket_number.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.phone_number.toLowerCase().includes(q)
    );
  }, [tickets, filter]);

  const startEdit = (t: TicketRow) => {
    setEditingNumber(t.ticket_number);
    setForm(toForm(t));
    setError(null);
  };

  const cancelEdit = () => {
    setEditingNumber(null);
    setForm(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingNumber || !form) return;
    if (!form.name.trim() || !form.phoneNumber.trim()) {
      setError('Name and phone number are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await ticketService.updateTicket(editingNumber, form);
      setTickets((prev) =>
        prev.map((t) => (t.ticket_number === editingNumber ? updated : t))
      );
      cancelEdit();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: TicketRow) => {
    if (
      !confirm(
        `Delete ticket #${t.ticket_number} (${t.name})?\n\nThis cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingNumber(t.ticket_number);
    setError(null);
    try {
      await ticketService.deleteTicket(t.ticket_number);
      setTickets((prev) => prev.filter((x) => x.ticket_number !== t.ticket_number));
      if (editingNumber === t.ticket_number) cancelEdit();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingNumber(null);
    }
  };

  return (
    <div className="ticket-editor">
      <div className="editor-header">
        <h2>🛠️ Ticket Editor</h2>
        <p>Admin-only view for editing and deleting assigned tickets.</p>
      </div>

      <div className="editor-toolbar">
        <input
          type="text"
          className="editor-filter"
          placeholder="Filter by ticket #, name, or phone…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button className="secondary" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="editor-error">{error}</div>}

      <div className="editor-list">
        {loading ? (
          <p className="editor-loading">Loading tickets…</p>
        ) : filtered.length === 0 ? (
          <p className="empty">No tickets match.</p>
        ) : (
          <ul>
            {filtered.map((t) => {
              const isEditing = editingNumber === t.ticket_number;
              return (
                <li key={t.ticket_number} className={isEditing ? 'editing' : ''}>
                  {!isEditing && (
                    <>
                      <div className="ticket-info">
                        <span className="ticket-num">#{t.ticket_number}</span>
                        <span className="ticket-name">{t.name}</span>
                        <span className="ticket-phone">{t.phone_number}</span>
                        <span className="ticket-flags">
                          <span className={`badge ${t.paid ? 'yes' : 'no'}`}>
                            {t.paid ? '✓ Paid' : 'Unpaid'}
                          </span>
                          <span className={`badge ${t.checked_in ? 'yes' : 'no'}`}>
                            {t.checked_in ? '✓ Checked in' : 'Not checked in'}
                          </span>
                          <span className={`badge ${t.expected ? 'yes' : 'no'}`}>
                            {t.expected ? 'Expected' : 'Not expected'}
                          </span>
                        </span>
                        {t.created_by && (
                          <span className="ticket-audit">added by {t.created_by}</span>
                        )}
                      </div>
                      <div className="ticket-actions">
                        <button className="secondary" onClick={() => startEdit(t)}>
                          Edit
                        </button>
                        <button
                          className="danger"
                          onClick={() => handleDelete(t)}
                          disabled={deletingNumber === t.ticket_number}
                        >
                          {deletingNumber === t.ticket_number ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </>
                  )}

                  {isEditing && form && (
                    <form className="ticket-edit-form" onSubmit={handleSave}>
                      <div className="edit-header">
                        Editing <strong>#{t.ticket_number}</strong>
                      </div>
                      <div className="edit-grid">
                        <label>
                          Name
                          <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                          />
                        </label>
                        <label>
                          Phone
                          <input
                            type="tel"
                            value={form.phoneNumber}
                            onChange={(e) =>
                              setForm({ ...form, phoneNumber: e.target.value })
                            }
                            required
                          />
                        </label>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={form.paid}
                            onChange={(e) => setForm({ ...form, paid: e.target.checked })}
                          />
                          Paid
                        </label>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={form.checkedIn}
                            onChange={(e) =>
                              setForm({ ...form, checkedIn: e.target.checked })
                            }
                          />
                          Checked in
                        </label>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={form.expected}
                            onChange={(e) =>
                              setForm({ ...form, expected: e.target.checked })
                            }
                          />
                          Expected
                        </label>
                      </div>
                      <div className="edit-actions">
                        <button type="submit" disabled={saving}>
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
