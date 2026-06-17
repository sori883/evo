import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getCurrentUser } from "@/lib/session";

/** 認証済みエリアの共通シェル（サイドバー + 本文）。 */
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-dvh">
      <Sidebar email={user.email} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
