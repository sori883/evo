import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "evo chat",
  description: "AgentCore 対話エージェント",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-dvh bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
