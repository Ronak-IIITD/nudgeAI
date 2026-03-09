import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="page-shell min-h-screen bg-[var(--background)]">
      <Sidebar />
      <main className="relative min-h-screen p-6 lg:ml-72 lg:p-8 lg:pr-10">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
