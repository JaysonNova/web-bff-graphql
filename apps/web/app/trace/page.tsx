"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { TraceSnapshot, SessionUser } from "@demo/contracts";

type TraceResponse = {
  session: {
    id: string;
    user: SessionUser;
    createdAt: string;
  };
  lastTrace: TraceSnapshot | null;
};

export default function TracePage() {
  const [data, setData] = useState<TraceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch("/api/trace");

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const json = (await response.json()) as TraceResponse | { message: string };

      if (!cancelled) {
        if (!response.ok || !("session" in json)) {
          setError("Unable to load trace snapshot.");
        } else {
          setData(json);
        }
      }
    }

    load().catch(() => {
      if (!cancelled) {
        setError("Unable to load trace snapshot.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <section className="hero">
        <span className="pill">Trace View</span>
        <h1>One page explains both layers.</h1>
        <p>
          This page is driven entirely by the BFF session. It shows who the browser is signed in as, which
          GraphQL operation last ran, and what the orchestration layer hit downstream.
        </p>
      </section>

      <section className="row" style={{ marginBottom: 20 }}>
        <Link href="/orders" className="button secondary">
          Back to orders
        </Link>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="button secondary">
            Sign out
          </button>
        </form>
      </section>

      {error ? (
        <section className="panel">
          <p className="error">{error}</p>
        </section>
      ) : null}

      {data ? (
        <section className="grid two">
          <article className="panel stack">
            <h2>Session snapshot</h2>
            <div className="card">
              <pre>{JSON.stringify(data.session, null, 2)}</pre>
            </div>
          </article>

          <article className="panel stack">
            <h2>Latest GraphQL trace</h2>
            {data.lastTrace ? (
              <>
                <div className="card">
                  <pre>{JSON.stringify(data.lastTrace, null, 2)}</pre>
                </div>
                <ul className="trace-list">
                  {data.lastTrace.downstream.map((entry, index) => (
                    <li key={`${entry.service}-${index}`} className="trace-item">
                      <div className={`status ${entry.status === "ok" ? "ok" : "error"}`}>{entry.status}</div>
                      <strong>
                        {entry.service} {entry.path}
                      </strong>
                      <p className="muted" style={{ margin: "6px 0 0" }}>
                        {entry.durationMs}ms{entry.detail ? ` · ${entry.detail}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="muted">No GraphQL request yet. Visit the orders screens first.</p>
            )}
          </article>
        </section>
      ) : null}
    </main>
  );
}
