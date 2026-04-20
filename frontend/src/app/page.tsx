"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface Item {
  id: number;
  name: string;
  description: string | null;
}

interface HealthData {
  status: string;
  version: string;
  environment: string;
  item_count: number;
  uptime_seconds: number;
}

type FormData = { name: string; description: string };

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState<FormData>({ name: "", description: "" });
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    const url = search
      ? `${API_URL}/items/?search=${encodeURIComponent(search)}`
      : `${API_URL}/items/`;
    const res = await fetch(url);
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }, [search]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/health`);
      const data = await res.json();
      setHealth(data);
      setHealthError(false);
    } catch {
      setHealthError(true);
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setForm({ name: "", description: "" });
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSubmitting(true);
    if (editingItem) {
      await fetch(`${API_URL}/items/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch(`${API_URL}/items/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSubmitting(false);
    resetForm();
    fetchItems();
    fetchHealth();
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_URL}/items/${id}`, { method: "DELETE" });
    fetchItems();
    fetchHealth();
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setForm({ name: item.name, description: item.description || "" });
    setShowForm(true);
  };

  const apiHealthy = !healthError && health !== null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              DevOps Demo App
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Items Manager &bull; Cloud Run</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Environment badge */}
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {health?.environment ?? "development"}
            </span>
            {/* API health pill */}
            <div
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                healthError
                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  : apiHealthy
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  healthError ? "bg-red-500" : apiHealthy ? "bg-green-500 animate-pulse" : "bg-gray-400"
                }`}
              />
              API {healthError ? "Down" : apiHealthy ? "Healthy" : "Checking…"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Stats cards */}
        {apiHealthy && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Items", value: health!.item_count },
              { label: "Environment", value: health!.environment },
              { label: "Version", value: `v${health!.version}` },
              { label: "Uptime", value: formatUptime(health!.uptime_seconds) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 px-4 py-3"
              >
                <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                  {label}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Items panel */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-zinc-800">
            <input
              type="text"
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                setEditingItem(null);
                setForm({ name: "", description: "" });
                setShowForm(true);
              }}
              className="shrink-0 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + Add Item
            </button>
          </div>

          {/* Inline form */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="flex flex-wrap gap-3 px-5 py-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50"
            >
              <p className="w-full text-sm font-semibold text-gray-700 dark:text-zinc-300 -mb-1">
                {editingItem ? `Edit item #${editingItem.id}` : "New item"}
              </p>
              <input
                required
                placeholder="Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="flex-1 min-w-0 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex-1 min-w-0 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {submitting ? "Saving…" : editingItem ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white px-4 py-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Items list */}
          {loading ? (
            <p className="px-5 py-12 text-center text-sm text-gray-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-gray-400 dark:text-zinc-500">
              {search ? "No items match your search." : "No items yet — add one above."}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="text-xs font-mono text-gray-400 dark:text-zinc-500 w-6 shrink-0">
                    #{item.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-zinc-600">
          API: {API_URL} &bull; Deployed via GitHub Actions → Google Cloud Run
        </p>
      </main>
    </div>
  );
}
