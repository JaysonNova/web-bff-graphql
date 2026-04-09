type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main>
      <section className="hero">
        <span className="pill">Web BFF + GraphQL + Local OIDC</span>
        <h1>Browser sessions stay in the BFF.</h1>
        <p>
          This demo keeps login state in a server-side session cookie, sends browser traffic only to the
          Next.js layer, and routes all business aggregation through a separate GraphQL service.
        </p>
      </section>

      <section className="grid two">
        <article className="panel stack">
          <h2>Sign in path</h2>
          <p className="muted">
            Click once. The BFF creates login state, the local OIDC provider issues tokens, and the BFF
            stores the resulting session in an <code>HttpOnly</code> cookie.
          </p>
          {error ? <p className="error">Latest login error: {error}</p> : null}
          <form action="/api/auth/login" method="post">
            <input type="hidden" name="redirectPath" value="/orders" />
            <button type="submit">Sign in with local OIDC</button>
          </form>
        </article>

        <article className="panel stack">
          <h2>Demo boundaries</h2>
          <div className="card">
            <strong>Web BFF:</strong>
            <p className="muted">Login callback, session cookie, trace endpoint, and GraphQL calls.</p>
          </div>
          <div className="card">
            <strong>GraphQL:</strong>
            <p className="muted">Aggregates users, orders, and catalog services. Returns partial detail data.</p>
          </div>
          <div className="card">
            <strong>Mock degradation:</strong>
            <p className="muted">Inventory lookup for product <code>prod-2</code> intentionally returns 503.</p>
          </div>
        </article>
      </section>
    </main>
  );
}
