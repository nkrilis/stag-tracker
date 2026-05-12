import { useEffect, useState, FormEvent } from 'react';
import {
  ticketHolderService,
  TicketHolder,
  TicketHolderInput,
} from '../services/ticketHolderService';
import './TicketHolders.css';

const emptyForm: TicketHolderInput = {
  holderEmail: '',
  rangeStart: '',
  rangeEnd: '',
  notes: '',
};

export function TicketHolders() {
  const [holders, setHolders] = useState<TicketHolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TicketHolderInput>(emptyForm);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setHolders(await ticketHolderService.list());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (h: TicketHolder) => {
    setEditingId(h.id);
    setForm({
      holderEmail: h.holder_email,
      rangeStart: h.range_start,
      rangeEnd: h.range_end,
      notes: h.notes ?? '',
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.holderEmail.trim() || !form.rangeStart.trim() || !form.rangeEnd.trim()) {
      setError('Holder email, range start, and range end are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await ticketHolderService.update(editingId, form);
      } else {
        await ticketHolderService.create(form);
      }
      resetForm();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (h: TicketHolder) => {
    if (!confirm(`Remove assignment of #${h.range_start}–#${h.range_end} from ${h.holder_email}?`)) {
      return;
    }
    const ok = await ticketHolderService.remove(h.id);
    if (ok) {
      await load();
    } else {
      setError('Failed to delete assignment.');
    }
  };

  // Group by holder for the summary view.
  const grouped = holders.reduce<Record<string, TicketHolder[]>>((acc, h) => {
    const key = h.holder_email;
    (acc[key] ||= []).push(h);
    return acc;
  }, {});

  return (
    <div className="ticket-holders">
      <div className="holders-header">
        <h2>🎫 Physical Ticket Assignments</h2>
        <p>
          Track which staff member is holding which physical ticket numbers.
        </p>
      </div>

      <form className="holder-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'Edit Assignment' : 'New Assignment'}</h3>
        <div className="form-grid">
          <label>
            Holder email
            <input
              type="email"
              value={form.holderEmail}
              onChange={(e) => setForm({ ...form, holderEmail: e.target.value })}
              placeholder="staff@example.com"
              required
            />
          </label>
          <label>
            Range start
            <input
              type="text"
              inputMode="numeric"
              value={form.rangeStart}
              onChange={(e) => setForm({ ...form, rangeStart: e.target.value })}
              placeholder="001"
              required
            />
          </label>
          <label>
            Range end
            <input
              type="text"
              inputMode="numeric"
              value={form.rangeEnd}
              onChange={(e) => setForm({ ...form, rangeEnd: e.target.value })}
              placeholder="050"
              required
            />
          </label>
          <label className="full">
            Notes (optional)
            <input
              type="text"
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Booklet handed over Friday night"
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : editingId ? 'Update' : 'Assign'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="secondary">
              Cancel
            </button>
          )}
        </div>

        {error && <div className="form-error">{error}</div>}
      </form>

      <div className="holders-list">
        <h3>Current Assignments</h3>
        {loading ? (
          <p className="holders-loading">Loading…</p>
        ) : holders.length === 0 ? (
          <p className="empty">No assignments yet.</p>
        ) : (
          Object.entries(grouped).map(([email, rows]) => (
            <div key={email} className="holder-group">
              <h4>{email}</h4>
              <ul>
                {rows.map((h) => (
                  <li key={h.id}>
                    <div className="holder-info">
                      <span className="range">
                        #{h.range_start} – #{h.range_end}
                      </span>
                      {h.notes && <span className="notes">{h.notes}</span>}
                      {h.assigned_by && (
                        <span className="assigned-by">assigned by {h.assigned_by}</span>
                      )}
                    </div>
                    <div className="holder-actions">
                      <button onClick={() => startEdit(h)} className="secondary">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(h)} className="danger">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
