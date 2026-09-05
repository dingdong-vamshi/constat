import type { Metadata } from "next";
import { Toaster } from "sonner";
import { StoreProvider } from "@/components/store";
import "./globals.css";
export const metadata: Metadata = {
  title: "ConStat — Construction Statistics Tracker",
  description: "Simple, local construction site operations tracking.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <StoreProvider>
          {children}
          <Toaster richColors position="bottom-right" closeButton />
        </StoreProvider>
      </body>
    </html>
  );
}
