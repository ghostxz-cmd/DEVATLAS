"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type InstructorItem = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  profile: {
    phone: string | null;
    title: string | null;
    bio: string | null;
    expertise: string[];
    permissions: {
      canManageCourses: boolean;
      canManageContent: boolean;
      canReviewSubmissions: boolean;
      canManageStudents: boolean;
      canViewSupport: boolean;
      isSupervisor: boolean;
    };
  };
  activityCount: number;
  lastActivityAt: string | null;
  lastActivityType: string | null;
};

type InstructorActivityItem = {
  id: string;
  activity_type: string;
  activity_payload: Record<string, unknown>;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminTeachersPage() {
  const [items, setItems] = useState<InstructorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [activity, setActivity] = useState<InstructorActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const [permissions, setPermissions] = useState({
    canManageCourses: true,
    canManageContent: false,
    canReviewSubmissions: true,
    canManageStudents: false,
    canViewSupport: false,
    isSupervisor: false,
  });

  const loadInstructors = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/instructors");
      if (!response.ok) {
        throw new Error("Nu am putut încărca profesorii.");
      }

      const payload = (await response.json()) as { items: InstructorItem[] };
      setItems(payload.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "A apărut o eroare.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInstructors();
  }, []);

  useEffect(() => {
    const loadActivity = async () => {
      if (!selectedInstructorId) {
        setActivity([]);
        return;
      }

      setActivityLoading(true);
      try {
        const response = await fetch(`/api/admin/instructors/${selectedInstructorId}/activity`);
        if (!response.ok) {
          throw new Error("Nu am putut încărca activitatea profesorului.");
        }

        const payload = (await response.json()) as { items: InstructorActivityItem[] };
        setActivity(payload.items ?? []);
      } catch {
        setActivity([]);
      } finally {
        setActivityLoading(false);
      }
    };

    void loadActivity();
  }, [selectedInstructorId]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.fullName.toLowerCase().includes(needle) ||
        item.email.toLowerCase().includes(needle) ||
        item.profile.title?.toLowerCase().includes(needle) ||
        item.profile.expertise.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [items, search]);

  const handleCreateInstructor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateLoading(true);
    setCreateMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/instructors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
          phone,
          title,
          bio,
          expertise: expertise
            .split(",")
            .map((token) => token.trim())
            .filter(Boolean),
          permissions,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Nu am putut crea contul de profesor.");
      }

      setCreateMessage("Cont profesor creat cu succes.");
      setFullName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setTitle("");
      setBio("");
      setExpertise("");

      await loadInstructors();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "A apărut o eroare la creare.");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <main className="p-0">
      <div className="border-b border-[#e0e2e7] px-4 py-3">
        <h1 className="text-xl font-semibold text-[#202124]">Gestionare Profesori</h1>
        <p className="mt-1 text-sm text-[#5f6368]">Creare conturi instructor, permisiuni avansate și monitorizare activitate.</p>
      </div>

      {error && <div className="mx-4 mt-3 rounded-lg bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f]">{error}</div>}
      {createMessage && <div className="mx-4 mt-3 rounded-lg bg-[#e6f4ea] px-3 py-2 text-sm text-[#137333]">{createMessage}</div>}

      <div className="grid gap-4 px-4 py-4 xl:grid-cols-[1.1fr_1.3fr]">
        <section className="rounded-2xl border border-[#e0e2e7] bg-white p-4">
          <h2 className="text-lg font-semibold text-[#202124]">Creează cont profesor</h2>

          <form onSubmit={handleCreateInstructor} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} required placeholder="Nume complet" className="h-11 rounded-lg border border-[#dadce0] px-3 text-sm outline-none" />
              <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" placeholder="Email" className="h-11 rounded-lg border border-[#dadce0] px-3 text-sm outline-none" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={password} onChange={(event) => setPassword(event.target.value)} required type="password" placeholder="Parolă inițială" className="h-11 rounded-lg border border-[#dadce0] px-3 text-sm outline-none" />
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Telefon (opțional)" className="h-11 rounded-lg border border-[#dadce0] px-3 text-sm outline-none" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titlu (ex: Senior Instructor)" className="h-11 rounded-lg border border-[#dadce0] px-3 text-sm outline-none" />
              <input value={expertise} onChange={(event) => setExpertise(event.target.value)} placeholder="Expertiză: JS, TS, AI" className="h-11 rounded-lg border border-[#dadce0] px-3 text-sm outline-none" />
            </div>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Bio profesional (opțional)" className="min-h-[90px] w-full rounded-lg border border-[#dadce0] px-3 py-2 text-sm outline-none" />

            <div className="grid gap-2 rounded-lg border border-[#e0e2e7] bg-[#f8f9fa] p-3 sm:grid-cols-2">
              {[
                ["canManageCourses", "Manage courses"],
                ["canManageContent", "Manage content"],
                ["canReviewSubmissions", "Review submissions"],
                ["canManageStudents", "Manage students"],
                ["canViewSupport", "View support"],
                ["isSupervisor", "Supervisor role"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-[#3c4043]">
                  <input
                    type="checkbox"
                    checked={permissions[key as keyof typeof permissions]}
                    onChange={(event) =>
                      setPermissions((prev) => ({
                        ...prev,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={createLoading}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#1a73e8] px-4 text-sm font-medium text-white transition hover:bg-[#1558b0] disabled:opacity-60"
            >
              {createLoading ? "Se creează..." : "Creează profesor"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#e0e2e7] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[#202124]">Conturi profesori</h2>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Caută profesori"
              className="h-10 w-64 rounded-lg border border-[#dadce0] px-3 text-sm outline-none"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e2e7] text-left text-xs uppercase tracking-[0.08em] text-[#5f6368]">
                  <th className="px-3 py-2">Profesor</th>
                  <th className="px-3 py-2">Rol</th>
                  <th className="px-3 py-2">Permisiuni</th>
                  <th className="px-3 py-2">Activitate</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-[#5f6368]">Loading...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-[#5f6368]">Nu există profesori.</td></tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="border-b border-[#eceff1] hover:bg-[#f8f9fa]">
                      <td className="px-3 py-3">
                        <div className="font-medium text-[#202124]">{item.fullName}</div>
                        <div className="text-xs text-[#5f6368]">{item.email}</div>
                        <div className="text-xs text-[#5f6368]">{item.profile.title || "Fără titlu"}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-[#202124]">{item.role}</div>
                        <div className="text-xs text-[#5f6368]">{item.status}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.profile.permissions)
                            .filter(([, enabled]) => enabled)
                            .map(([permission]) => (
                              <span key={`${item.id}-${permission}`} className="rounded-full bg-[#e8f0fe] px-2 py-0.5 text-xs text-[#174ea6]">
                                {permission}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-[#202124]">{item.activityCount} evenimente</div>
                        <div className="text-xs text-[#5f6368]">
                          {item.lastActivityAt ? formatDate(item.lastActivityAt) : "Fără activitate"}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedInstructorId(item.id)}
                          className="mt-1 text-xs font-medium text-[#1a73e8] hover:underline"
                        >
                          Vezi activitatea
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedInstructorId && (
            <div className="mt-4 rounded-lg border border-[#e0e2e7] bg-[#f8f9fa] p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#202124]">Activitate profesor</h3>
                <button type="button" className="text-xs text-[#5f6368]" onClick={() => setSelectedInstructorId(null)}>Închide</button>
              </div>

              <div className="mt-2 max-h-60 space-y-2 overflow-auto">
                {activityLoading ? (
                  <p className="text-xs text-[#5f6368]">Se încarcă activitatea...</p>
                ) : activity.length === 0 ? (
                  <p className="text-xs text-[#5f6368]">Nu există activitate.</p>
                ) : (
                  activity.map((event) => (
                    <div key={event.id} className="rounded-md border border-[#e0e2e7] bg-white p-2 text-xs text-[#3c4043]">
                      <div className="font-semibold text-[#202124]">{event.activity_type}</div>
                      <div className="text-[#5f6368]">{formatDate(event.created_at)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}