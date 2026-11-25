import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-serif";
import "./globals.css";
import { Pwa } from "@/components/pwa";

export const metadata: Metadata = {
  title: { default: "Οι Συνταγές της Μαμάς", template: "%s · Οι Συνταγές της Μαμάς" },
  description: "Το οικογενειακό μας βιβλίο συνταγών και αρχείο χειρόγραφων.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="el"><body><a className="skip" href="#main">Μετάβαση στο περιεχόμενο</a>{children}<Pwa /></body></html>;
}
