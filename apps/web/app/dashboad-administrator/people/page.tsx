"use client";

import { useEffect, useMemo, useState } from "react";

type PersonItem = {
  id: string;
  name: string;
  email: string;
  memberType: string;
  phone: string;
  tags: string[];
  tickets: number;
  lastSeen: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminPeoplePage() {
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/people", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Nu am putut încărca lista de people.");
        }

        const payload = (await response.json()) as { items: PersonItem[] };
        setPeople(payload.items ?? []);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "A apărut o eroare.");
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, []);

  const filteredPeople = useMemo(() => {
    const needle = search.trim().toLowerCase();

    if (!needle) {
      return people;
    }

    return people.filter((person) => {
      return (
        person.name.toLowerCase().includes(needle) ||
        person.email.toLowerCase().includes(needle) ||
        person.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [people, search]);

  return (
    <main className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e2e7] px-4 py-3">
        <h1 className="text-xl font-semibold text-[#202124]">People</h1>
        <div className="flex items-center gap-2">
          <div className="flex h-10 items-center rounded-lg border border-[#e0e2e7] bg-white px-3">
            <svg className="h-4 w-4 text-[#5f6368]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people"
              className="ml-2 w-56 bg-transparent text-sm outline-none"
            />
          </div>
          <button type="button" className="h-10 rounded-lg border border-[#e0e2e7] px-3 text-sm text-[#3c4043]">Filter</button>
          <button type="button" className="h-10 rounded-lg bg-[#1a73e8] px-4 text-sm font-medium text-white">Add Person</button>
        </div>
      </div>

      {error && <div className="mx-4 mt-3 rounded-lg bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f]">{error}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#e0e2e7] bg-[#f8f9fa] text-left text-xs uppercase tracking-[0.08em] text-[#5f6368]">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email Address</th>
              <th className="px-4 py-3 font-medium">Member Type</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Tag</th>
              <th className="px-4 py-3 font-medium">Tickets</th>
              <th className="px-4 py-3 font-medium">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#5f6368]">Loading people...</td>
              </tr>
            ) : filteredPeople.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#5f6368]">No people found.</td>
              </tr>
            ) : (
              filteredPeople.map((person) => (
                <tr key={person.id} className="border-b border-[#eceff1] text-[#3c4043] hover:bg-[#f8f9fa]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e8f0fe] text-xs font-semibold text-[#174ea6]">
                        {person.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="font-medium text-[#202124]">{person.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{person.email}</td>
                  <td className="px-4 py-3">{person.memberType}</td>
                  <td className="px-4 py-3">{person.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {person.tags.slice(0, 3).map((tag) => (
                        <span key={`${person.id}-${tag}`} className="rounded-full bg-[#e8f0fe] px-2 py-0.5 text-xs text-[#174ea6]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">{person.tickets}</td>
                  <td className="px-4 py-3 text-xs text-[#5f6368]">{formatDate(person.lastSeen)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
