import { ReactNode } from "react";
import { NavHeader } from "./NavHeader";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavHeader />
      <main className="flex-1 container mx-auto px-4 py-6 animate-fade-in">
        {children}
      </main>
      <footer className="border-t border-border py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Convert Sender
        </div>
      </footer>
    </div>
  );
};
