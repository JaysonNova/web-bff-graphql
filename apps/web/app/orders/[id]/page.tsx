"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { OrderDetail } from "@demo/contracts";

type OrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function OrderDetailPage({ params }: OrderPageProps) {
  const [orderId, setOrderId] = useState<string>("");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((value) => setOrderId(value.id));
  }, [params]);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let cancelled = false;

    async function load() {
      const response = await fetch(`/api/orders/${orderId}`);

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const json = (await response.json()) as { order?: OrderDetail; message?: string };

      if (!cancelled) {
        if (!response.ok || !json.order) {
          setError("Unable to load order detail.");
        } else {
          setOrder(json.order);
        }
      }
    }

    load().catch(() => {
      if (!cancelled) {
        setError("Unable to load order detail.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <main>
      <section className="hero">
        <span className="pill">Order Detail</span>
        <h1>Partial data survives downstream failure.</h1>
        <p>
          Product detail still renders even when the inventory endpoint fails. That failure is recorded in the
          trace page instead of breaking the whole screen.
        </p>
      </section>

      <section className="row" style={{ marginBottom: 20 }}>
        <Link href="/orders" className="button secondary">
          Back to orders
        </Link>
        <Link href="/trace" className="button secondary">
          Open trace view
        </Link>
      </section>

      <section className="panel stack">
        {error ? <p className="error">{error}</p> : null}
        {!order && !error ? <p>Loading order detail...</p> : null}
        {order ? (
          <>
            <div className="card">
              <div className="status muted">{order.status}</div>
              <h2 style={{ marginBottom: 6 }}>{order.id}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {order.customer.name} · ${order.total}
              </p>
            </div>

            <ul className="detail-list">
              {order.items.map((item) => (
                <li key={item.productId} className="detail-item">
                  <h3 style={{ margin: "0 0 6px" }}>{item.productName}</h3>
                  <p className="muted" style={{ margin: "0 0 8px" }}>
                    {item.category} · qty {item.quantity} · ${item.unitPrice}
                  </p>
                  {item.inventory ? (
                    <p className="ok" style={{ margin: 0 }}>
                      Inventory: {item.inventory.inStock} in {item.inventory.warehouse}
                    </p>
                  ) : (
                    <p className="error" style={{ margin: 0 }}>
                      Inventory temporarily unavailable
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </main>
  );
}
