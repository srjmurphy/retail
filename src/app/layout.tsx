import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RetailNext Maven | AI Retail Intelligence",
  description: "Maven turns customer intent into the next best retail action.",
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
