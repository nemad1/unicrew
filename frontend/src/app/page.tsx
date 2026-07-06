import { redirect } from "next/navigation";

export default function HomePage() {
  // Default entry point — the AuthProvider in the (dashboard) layout
  // will handle redirecting to /login if not authenticated.
  redirect("/inbox");
}
