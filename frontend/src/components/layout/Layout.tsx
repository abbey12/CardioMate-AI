import { ReactNode } from "react";
import { NavBar } from "./NavBar";
import { SideNav } from "./SideNav";

type LayoutProps = {
  children: ReactNode;
};

export function Layout({ children }: LayoutProps) {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <NavBar />
      <SideNav />
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

