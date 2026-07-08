import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthProvider } from "@/components/AuthProvider";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "talent-app | タレントマネジメント",
  description: "社内経歴書管理システム",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="ja">
      <body className="min-h-screen bg-[--background] antialiased">
        <AuthProvider>
          <Header user={session ? session.user : null} />
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
