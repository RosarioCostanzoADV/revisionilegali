import { LogoutButton } from "@/components/LogoutButton";
import { Alert } from "@/components/ui/Alert";

export const dynamic = "force-dynamic";

export default async function AccountSuspendedPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  const isPlanExpired = motivo === "piano_scaduto";

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">
        {isPlanExpired ? "Piano scaduto" : "Account sospeso"}
      </h2>
      <Alert tone="warning">
        {isPlanExpired ? (
          <>
            Il piano del tuo studio è scaduto e l&apos;accesso alla piattaforma è stato bloccato.
            Contatta il supporto all&apos;indirizzo{" "}
            <a className="font-medium underline" href="mailto:support@revisionilegali.it">
              support@revisionilegali.it
            </a>{" "}
            per rinnovare la licenza.
          </>
        ) : (
          <>
            Il tuo account è stato sospeso. Contatta il supporto all&apos;indirizzo{" "}
            <a className="font-medium underline" href="mailto:support@revisionilegali.it">
              support@revisionilegali.it
            </a>{" "}
            per maggiori informazioni.
          </>
        )}
      </Alert>
      <LogoutButton />
    </div>
  );
}
