import "./globals.css";
import type { Metadata } from "next";
import Companion from "@/components/Companion";
import CustomCursor from "@/components/CustomCursor";
import ToastContainer from "@/components/Toast";

export const metadata: Metadata = {
  title: "Shiplane — Ops Dashboard",
  description: "Onboarding companion demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Companion />
        <CustomCursor />
        <ToastContainer />
      </body>
    </html>
  );
}
