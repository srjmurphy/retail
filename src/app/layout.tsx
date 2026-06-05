import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RetailNext AI Retail Intelligence",
  description: "Recommend, locate and optimise retail execution intelligence demo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
