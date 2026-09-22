import AdminClient from "@/app/admin/AdminClient";
import { redirect } from "next/navigation";
import { getAdminFromSession } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdminFromSession();
  if (!admin) redirect("/admin/login");
  return <AdminClient />;
}
