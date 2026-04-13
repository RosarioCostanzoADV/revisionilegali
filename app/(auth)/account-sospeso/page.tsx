import { LogoutButton } from "@/components/LogoutButton";
import { Alert } from "@/components/ui/Alert";

export const dynamic = "force-dynamic";

export default function AccountSuspendedPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Account sospeso</h2>
      <Alert tone="warning">
        Il tuo account è stato sospeso. Contatta il supporto all'indirizzo{" "}
        <a
          className="font-medium underline"
          href="mailto:support@revisionilegali.it"
        >
          support@revisionilegali.it
        </a>{" "}
        per maggiori informazioni.
      </Alert>
      <LogoutButton />
    </div>
  );
}
