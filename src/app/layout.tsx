import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "集金Pay - 決済管理システム",
  description: "イベント決済管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
