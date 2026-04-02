"use client";

import { useEffect, useState } from "react";
import type { AdminOverviewResponse } from "./types";

export function useAdminOverview() {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/overview", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Nu am putut încărca datele de management.");
        }

        const payload = (await response.json()) as AdminOverviewResponse;
        setData(payload);
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

  return { data, loading, error };
}
