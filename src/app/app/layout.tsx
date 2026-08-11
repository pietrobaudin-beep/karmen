import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLabels } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { Sidebar } from "./nav";
import { KarmenBubble } from "./KarmenBubble";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const labels = await getLabels(user.orgId, user.personaType);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        labels={labels}
        orgName={user.orgName}
        userName={user.name}
        avatarUrl={user.avatarUrl}
        role={user.role}
        permissions={user.permissions}
      />
      <div className="flex-1 overflow-x-hidden">{children}</div>
      {can(user, "assistant") && <KarmenBubble />}
    </div>
  );
}
