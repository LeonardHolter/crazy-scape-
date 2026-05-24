"use client";

import { useState, useEffect, useCallback } from "react";

interface Listing {
  id: number;
  url: string;
  title: string;
  asking_price: string | null;
  annual_revenue: string | null;
  net_cash_flow: string | null;
  description: string | null;
  status: string;
  first_seen: string;
  last_seen: string;
  last_checked: string;
}

interface Stats {
  active: number;
  gone: number;
  lastCheck: string | null;
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "gone">("all");

  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch("/api/listings");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setListings(data.listings);
        setStats(data.stats);
        setError(null);
      }
    } catch {
      setError("Failed to fetch listings");
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  async function handleScrape() {
    setScraping(true);
    setError(null);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        await fetchListings();
      }
    } catch {
      setError("Scrape request failed");
    } finally {
      setScraping(false);
    }
  }

  const filtered = listings.filter((l) => {
    if (filter === "active") return l.status === "active";
    if (filter === "gone") return l.status === "gone";
    return true;
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Synergy BB Deal Scraper
        </h1>
        <p className="text-gray-500 mt-1">
          Services businesses for sale &middot; $746K&ndash;$3M net cash flow
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button
          onClick={handleScrape}
          disabled={scraping}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {scraping ? "Scraping..." : "Run Scrape"}
        </button>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["all", "active", "gone"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {stats && (
          <div className="ml-auto text-sm text-gray-500 flex gap-4">
            <span>
              <span className="font-semibold text-green-600">{stats.active}</span> active
            </span>
            <span>
              <span className="font-semibold text-red-500">{stats.gone}</span> gone
            </span>
            {stats.lastCheck && (
              <span>
                Last check: {new Date(stats.lastCheck + "Z").toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Business
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Asking Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Net Cash Flow
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                First Seen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  {listings.length === 0
                    ? 'No listings yet. Click "Run Scrape" to fetch listings.'
                    : "No listings match this filter."}
                </td>
              </tr>
            ) : (
              filtered.map((listing) => (
                <tr
                  key={listing.id}
                  className={`hover:bg-gray-50 ${
                    listing.status === "gone" ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        listing.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {listing.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium text-sm leading-tight block"
                    >
                      {listing.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-sm font-semibold text-gray-900">
                    {listing.asking_price ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-sm text-gray-700">
                    {listing.annual_revenue ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-sm text-gray-700">
                    {listing.net_cash_flow ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-sm truncate">
                    {listing.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                    {new Date(listing.first_seen + "Z").toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
