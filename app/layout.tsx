import { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import SessionProvider from "@/providers/SessionProvider";
import { authOptions } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CyberShoora Meet",
  description: "CyberShoora Meet - Secure video collaboration focused workspace",
  icons: {
    icon: [
      { url: "/icons/Logolight.svg", media: "(prefers-color-scheme: light)" },
      { url: "/icons/Logodark.svg", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} bg-dark-2 text-white`}
        suppressHydrationWarning
      >
        <SessionProvider session={session}>
          <Toaster />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
