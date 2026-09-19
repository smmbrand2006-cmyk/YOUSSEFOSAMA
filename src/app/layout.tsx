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
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
