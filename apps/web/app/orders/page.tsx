"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { OrderSummary } from "@demo/contracts";

type OrdersResponse = {
  orders: OrderSummary[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch("/api/orders");

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const json = (await response.json()) as OrdersResponse | { message: string };

      if (!cancelled) {
        if (!response.ok || !("orders" in json)) {
          setError("Unable to load orders from the BFF.");
        } else {
          setOrders(json.orders);
        }
        setLoading(false);
      }
    }

    load().catch(() => {
      if (!cancelled) {
        setError("Unable to load orders from the BFF.");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <section className="hero">
        <span className="pill">Orders Overview</span>
        <h1>The browser only sees BFF endpoints.</h1>
        <p>The page calls <code>/api/orders</code>. The BFF attaches an internal token and forwards to GraphQL.</p>
      </section>

      <section className="row" style={{ marginBottom: 20 }}>
        <Link href="/trace" className="button secondary">
          Open trace view
        </Link>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="button secondary">
            Sign out
          </button>
        </form>
      </section>

      <section className="panel stack">
        {loading ? <p>Loading orders...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <div className="detail-list">
          {orders.map((order) => (
            <article key={order.id} className="detail-item">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div className="status muted">{order.status}</div>
                  <h2 style={{ margin: "6px 0 8px" }}>{order.id}</h2>
                  <p className="muted" style={{ margin: 0 }}>
                    {order.customerName} · {order.itemCount} items · ${order.total}
                  </p>
                </div>
                <Link href={`/orders/${order.id}`} className="button">
                  View detail
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
