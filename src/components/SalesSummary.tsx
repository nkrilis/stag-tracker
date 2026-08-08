import { useEffect, useMemo, useState, FormEvent } from 'react';
import { ticketService, SellerSummary } from '../services/ticketService';
import {
  sellerCollectionService,
  SellerCollection,
} from '../services/sellerCollectionService';
import { TicketRow } from '../config/supabase';
import { TICKET_PRICE } from '../config/eventConfig';
import './SalesSummary.css';

const money = (n: number) =>
  n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });

export function SalesSummary() {
  const [summaries, setSummaries] = useState<SellerSummary[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [collections, setCollections] = useState<SellerCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSeller, setActiveSeller] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, allTickets, cols] = await Promise.all([
        ticketService.getSellerSummaries(TICKET_PRICE),
        ticketService.getAllTickets(),
        sellerCollectionService.list(),
      ]);
      setSummaries(rows);
      setTickets(allTickets);
      setCollections(cols);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Total already collected from each seller, keyed by lowercased email.
  const collectedBySeller = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of collections) {
      const key = c.seller.toLowerCase();
      map.set(key, (map.get(key) ?? 0) + Number(c.amount));
    }
    return map;
  }, [collections]);

  const collectedFor = (seller: string) =>
    collectedBySeller.get(seller.toLowerCase()) ?? 0;

  const totals = useMemo(
    () =>
      summaries.reduce(
        (acc, s) => {
          const received = collectedBySeller.get(s.seller.toLowerCase()) ?? 0;
          return {
            totalSold: acc.totalSold + s.totalSold,
            paidCount: acc.paidCount + s.paidCount,
            unpaidCount: acc.unpaidCount + s.unpaidCount,
            owed: acc.owed + s.totalValue,
            received: acc.received + received,
            remaining: acc.remaining + (s.totalValue - received),
          };
        },
        {
          totalSold: 0,
          paidCount: 0,
          unpaidCount: 0,
          owed: 0,
          received: 0,
          remaining: 0,
        }
      ),
    [summaries, collectedBySeller]
  );

  const activeSummary = summaries.find((s) => s.seller === activeSeller) ?? null;

  return (
    <div className="sales-summary">
      <div className="sales-header">
        <h2>💰 Seller Balances</h2>
        <p>
          Tickets entered per seller and the balance to collect (ticket price{' '}
          {money(TICKET_PRICE)}). Click a seller to record a collection.
        </p>
      </div>

      <div className="sales-toolbar">
        <button className="secondary" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="sales-error">{error}</div>}

      {loading ? (
        <p className="sales-loading">Loading…</p>
      ) : summaries.length === 0 ? (
        <p className="empty">No tickets have been sold yet.</p>
      ) : (
        <>
          <div className="sales-cards">
            {summaries.map((s) => {
              const received = collectedFor(s.seller);
              const remaining = s.totalValue - received;
              return (
                <button
                  key={s.seller}
                  className="seller-card"
                  onClick={() => setActiveSeller(s.seller)}
                >
                  <div className="seller-name">{s.seller}</div>
                  <div className="seller-stats">
                    <div className="stat">
                      <span className="stat-label">Sold</span>
                      <span className="stat-value">{s.totalSold}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Paid</span>
                      <span className="stat-value">{s.paidCount}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Unpaid</span>
                      <span className="stat-value">{s.unpaidCount}</span>
                    </div>
                  </div>
                  <div className="seller-balance">
                    <div className="balance-row collect">
                      <span>Owed (all tickets)</span>
                      <strong>{money(s.totalValue)}</strong>
                    </div>
                    <div className="balance-row received">
                      <span>Collected</span>
                      <strong>{money(received)}</strong>
                    </div>
                    <div
                      className={`balance-row remaining ${
                        remaining <= 0 ? 'settled' : ''
                      }`}
                    >
                      <span>Remaining</span>
                      <strong>{money(remaining)}</strong>
                    </div>
                    <div className="balance-row unpaid">
                      <span>Of which unpaid</span>
                      <strong>{money(s.outstanding)}</strong>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="sales-table-wrap">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Sold</th>
                  <th>Paid</th>
                  <th>Unpaid</th>
                  <th>Owed</th>
                  <th>Collected</th>
                  <th>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => {
                  const received = collectedFor(s.seller);
                  const remaining = s.totalValue - received;
                  return (
                    <tr
                      key={s.seller}
                      className="clickable"
                      onClick={() => setActiveSeller(s.seller)}
                    >
                      <td className="seller">{s.seller}</td>
                      <td>{s.totalSold}</td>
                      <td>{s.paidCount}</td>
                      <td>{s.unpaidCount}</td>
                      <td className="collect">{money(s.totalValue)}</td>
                      <td className="received">{money(received)}</td>
                      <td className={remaining <= 0 ? 'settled' : 'outstanding'}>
                        {money(remaining)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="seller">All sellers</td>
                  <td>{totals.totalSold}</td>
                  <td>{totals.paidCount}</td>
                  <td>{totals.unpaidCount}</td>
                  <td className="collect">{money(totals.owed)}</td>
                  <td className="received">{money(totals.received)}</td>
                  <td className={totals.remaining <= 0 ? 'settled' : 'outstanding'}>
                    {money(totals.remaining)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {activeSummary && (
        <CollectionModal
          summary={activeSummary}
          tickets={tickets.filter(
            (t) =>
              (t.created_by?.trim().toLowerCase() || 'unknown') ===
              activeSummary.seller.toLowerCase()
          )}
          collections={collections.filter(
            (c) => c.seller.toLowerCase() === activeSummary.seller.toLowerCase()
          )}
          onClose={() => setActiveSeller(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

interface CollectionModalProps {
  summary: SellerSummary;
  tickets: TicketRow[];
  collections: SellerCollection[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}

function CollectionModal({
  summary,
  tickets,
  collections,
  onClose,
  onChanged,
}: CollectionModalProps) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTickets, setShowTickets] = useState<'paid' | 'unpaid' | null>(null);

  const paidTickets = tickets.filter((t) => t.paid);
  const unpaidTickets = tickets.filter((t) => !t.paid);

  const received = collections.reduce((sum, c) => sum + Number(c.amount), 0);
  const remaining = summary.totalValue - received;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await sellerCollectionService.create(summary.seller, value, notes);
      setAmount('');
      setNotes('');
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this collection entry?')) return;
    setError(null);
    try {
      await sellerCollectionService.remove(id);
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="collection-backdrop" onClick={onClose}>
      <div className="collection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="collection-head">
          <h3>{summary.seller}</h3>
          <button className="close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="collection-summary">
          <div className="cs-row">
            <span>Owed (all tickets)</span>
            <strong>{money(summary.totalValue)}</strong>
          </div>
          <div className="cs-row">
            <span>Collected so far</span>
            <strong>{money(received)}</strong>
          </div>
          <div className={`cs-row remaining ${remaining <= 0 ? 'settled' : ''}`}>
            <span>Remaining to collect</span>
            <strong>{money(remaining)}</strong>
          </div>
          <button
            type="button"
            className={`cs-row toggle ${showTickets === 'paid' ? 'open' : ''}`}
            onClick={() => setShowTickets(showTickets === 'paid' ? null : 'paid')}
          >
            <span>Paid tickets ({summary.paidCount}) ▾</span>
            <strong>{money(summary.collected)}</strong>
          </button>
          {showTickets === 'paid' && (
            <TicketList tickets={paidTickets} emptyLabel="No paid tickets." />
          )}
          <button
            type="button"
            className={`cs-row toggle unpaid ${
              showTickets === 'unpaid' ? 'open' : ''
            }`}
            onClick={() =>
              setShowTickets(showTickets === 'unpaid' ? null : 'unpaid')
            }
          >
            <span>Unpaid tickets ({summary.unpaidCount}) ▾</span>
            <strong>{money(summary.outstanding)}</strong>
          </button>
          {showTickets === 'unpaid' && (
            <TicketList tickets={unpaidTickets} emptyLabel="No unpaid tickets." />
          )}
        </div>

        <form className="collection-form" onSubmit={handleSubmit}>
          <label>
            Amount collected
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </label>
          <label>
            Note (optional)
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. cash handed over Friday"
            />
          </label>
          <div className="collection-actions">
            <button
              type="button"
              className="quick"
              onClick={() => setAmount(String(remaining > 0 ? remaining : 0))}
            >
              Full remaining
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Record collection'}
            </button>
          </div>
          {error && <div className="collection-error">{error}</div>}
        </form>

        <div className="collection-history">
          <h4>History</h4>
          {collections.length === 0 ? (
            <p className="empty">No collections recorded yet.</p>
          ) : (
            <ul>
              {collections.map((c) => (
                <li key={c.id}>
                  <div className="ch-info">
                    <span className="ch-amount">{money(Number(c.amount))}</span>
                    <span className="ch-date">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                    {c.notes && <span className="ch-notes">{c.notes}</span>}
                  </div>
                  <button className="ch-delete" onClick={() => handleDelete(c.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketList({
  tickets,
  emptyLabel,
}: {
  tickets: TicketRow[];
  emptyLabel: string;
}) {
  if (tickets.length === 0) {
    return <p className="ticket-list-empty">{emptyLabel}</p>;
  }
  return (
    <ul className="ticket-list">
      {tickets.map((t) => (
        <li key={t.ticket_number}>
          <span className="tl-num">#{t.ticket_number}</span>
          <span className="tl-name">{t.name}</span>
          <span className="tl-phone">{t.phone_number}</span>
        </li>
      ))}
    </ul>
  );
}
