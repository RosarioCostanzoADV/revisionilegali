import { redirect } from "next/navigation";

// Root path is handled by the middleware for authenticated users.
// This server component only runs if middleware let it through.
export default function RootPage() {
  redirect("/login");
}
