import type { ReactNode } from "react";

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
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          background: "#0b0b0f",
          color: "#e8e8ea",
        }}
      >
        {children}
      </body>
    </html>
  );
}
