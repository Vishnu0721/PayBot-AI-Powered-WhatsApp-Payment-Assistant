import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { createProductApi, deleteProductApi, listProductsApi, updateProductApi } from '../services/api.js';
import { formatINR } from '../lib/format.js';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', price: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    const res = await listProductsApi();
    setProducts(res.products || []);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        description: form.description,
      };
      if (editing) await updateProductApi(editing, payload);
      else await createProductApi(payload);
      setForm({ name: '', price: '', description: '' });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id) {
    await deleteProductApi(id);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Optional shortcuts for items you sell often. You can collect without creating products."
      />
      <form onSubmit={onSubmit} className="mt-6 grid gap-3 pb-card px-5 py-5 md:grid-cols-4">
        <input
          className="pb-input"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="pb-input"
          placeholder="Price"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d]/g, '') })}
        />
        <input
          className="pb-input"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Button type="submit" loading={saving}>
          {editing ? 'Save product' : 'Add product'}
        </Button>
      </form>
      {error && <p className="mt-3 text-sm text-[#B42318]">{error}</p>}
      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading products...</p>
      ) : !products.length ? (
        <div className="mt-6">
          <EmptyState
            title="No products yet."
            description="You can collect payments without creating products."
          />
        </div>
      ) : (
        <div className="mt-5 overflow-hidden pb-card">
          <div className="divide-y divide-line">
            {products.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {p.name}{' '}
                    {!p.active && <span className="text-[11px] font-semibold text-muted">INACTIVE</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {formatINR(p.price)} {p.description ? `· ${p.description}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditing(p.id);
                      setForm({ name: p.name, price: String(p.price), description: p.description || '' });
                    }}
                  >
                    Edit
                  </Button>
                  {p.active && (
                    <Button size="sm" variant="ghost" onClick={() => deactivate(p.id)}>
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
