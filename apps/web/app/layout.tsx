import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Web BFF GraphQL Demo",
  description: "Next.js BFF + GraphQL orchestration + local OIDC demo"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
