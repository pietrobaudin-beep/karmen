import { notFound } from "next/navigation";
import { getOrgPublic } from "@/lib/queries";
import { getPreset } from "@/lib/personas";
import { Mark } from "@/components/Mark";
import { BookingForm } from "./BookingForm";

export default async function BookingPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const org = await getOrgPublic(orgId);
  if (!org) notFound();
  const preset = getPreset(org.personaType);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <Mark className="mx-auto h-10 w-10 text-brand" />
        <h1 className="mt-3 text-2xl font-semibold">{org.name}</h1>
        <p className="mt-1 text-text-dim">Agende seu {preset.sessionLabel.toLowerCase()} online.</p>
      </div>

      <BookingForm orgId={org.id} sessionLabel={preset.sessionLabel} />

      <p className="text-center text-xs text-text-dim">
        Powered by <span className="font-medium text-text">KARMEN</span>
      </p>
    </main>
  );
}
