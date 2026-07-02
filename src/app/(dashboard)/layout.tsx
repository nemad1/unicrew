import { AuthProvider } from "@/contexts/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
import { RoleSwitcher } from "@/components/role-switcher";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="h-screen w-full flex bg-white text-gray-900 font-sans antialiased relative">
        <Toaster position="top-right" richColors />
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">{children}</main>
        <RoleSwitcher />
      </div>
    </AuthProvider>
  );
}
