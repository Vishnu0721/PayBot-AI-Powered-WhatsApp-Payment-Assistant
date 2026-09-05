import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { inviteStaffApi, listStaffApi, removeStaffApi } from '../services/api.js';
import { formatPhoneDisplay } from '../lib/format.js';

export default function Team() {
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ phone: '', name: '', role: 'collector' });

  async function refresh() {
    const data = await listStaffApi();
    setMembers(data.members || []);
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function onInvite(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await inviteStaffApi({
        phone: `+91${form.phone}`,
        name: form.name,
        role: form.role,
      });
      setMessage('Team member invited. They can sign in with that WhatsApp number.');
      setForm({ phone: '', name: '', role: 'collector' });
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id) {
    setBusy(true);
    setError('');
    try {
      await removeStaffApi(id);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Team"
        description="Invite staff to collect payments for your business. Only the owner can manage the team and Razorpay keys."
      />
      {error && <p className="mt-4 text-sm text-[#B42318]">{error}</p>}
      {message && <p className="mt-4 text-sm text-emerald">{message}</p>}

      <form className="mt-6 space-y-4 border-b border-line pb-8" onSubmit={onInvite}>
        <label className="block text-sm">
          <span className="text-muted">Name</span>
          <input
            className="mt-1.5 h-11 w-full border-b border-line-strong bg-transparent outline-none focus:border-forest"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">WhatsApp number</span>
          <div className="mt-1.5 flex border-b border-line-strong focus-within:border-forest">
            <span className="flex h-11 items-center pr-3 text-muted">+91</span>
            <input
              className="h-11 flex-1 bg-transparent outline-none"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              required
            />
          </div>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Role</span>
          <select
            className="mt-1.5 h-11 w-full border-b border-line-strong bg-transparent outline-none focus:border-forest"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="collector">Collector — create and track payments</option>
            <option value="admin">Admin — same as collector (owner-only settings stay locked)</option>
          </select>
        </label>
        <Button type="submit" loading={busy} disabled={form.phone.length !== 10}>
          Invite
        </Button>
      </form>

      <h2 className="mt-8 text-sm font-semibold">Members</h2>
      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      ) : !members.length ? (
        <div className="mt-4">
          <EmptyState title="No staff yet." description="Invite a teammate with their WhatsApp number." />
        </div>
      ) : (
        <div className="mt-4 divide-y divide-line border-y border-line">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-medium">{m.name || 'Team member'}</p>
                <p className="mt-1 text-sm text-muted">
                  {m.phoneDisplay || formatPhoneDisplay(m.phoneNumber)} · {m.role}
                  {!m.active ? ' · inactive' : ''}
                </p>
              </div>
              <Button size="sm" variant="ghost" loading={busy} onClick={() => onRemove(m.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
