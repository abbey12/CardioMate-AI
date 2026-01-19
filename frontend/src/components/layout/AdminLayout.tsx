import { ReactNode } from "react";
import { AdminNavBar } from "./AdminNavBar";
import { AdminSideNav } from "./AdminSideNav";
import { COLORS } from "../../ui/colors";

type AdminLayoutProps = {
  children: ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.GRAY_50 }}>
      <AdminNavBar />
      <AdminSideNav />
      <main
        style={{
          marginLeft: "256px",
          marginTop: "64px",
          padding: "32px",
          maxWidth: "1400px",
          width: "calc(100% - 256px)",
        }}
      >
        {children}
      </main>
    </div>
  );
}

