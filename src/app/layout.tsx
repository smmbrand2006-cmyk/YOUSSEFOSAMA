import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ChatProvider } from "@/lib/contexts/ChatContext";
import { CallProvider } from "@/lib/contexts/CallContext";
import CallOverlay from "@/components/calls/CallOverlay";

export const metadata: Metadata = {
  title: "Youssef App | Premium Chat",
  description:
    "A premium messaging application with real-time chat, voice & video calls, and more.",
  icons: {
    icon: "/favicon.ico",
  },
};

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ChatProvider>
        <CallProvider>
          {children}
          <CallOverlay />
        </CallProvider>
      </ChatProvider>
    </AuthProvider>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
