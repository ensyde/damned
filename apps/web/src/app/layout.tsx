import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { AuthProvider } from "@/components/layout/AuthProvider";
import { Toaster } from "react-hot-toast";
import { SocketProvider } from "@/components/layout/SocketProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Damned Community",
    template: "%s | Damned Community",
  },
  description: "An online gaming & developer community",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <AuthProvider>
          <ThemeProvider>
            <SocketProvider>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
                  {children}
                </main>
                <footer className="border-t border-border py-6 text-center text-text-muted text-sm">
                  <p>© {new Date().getFullYear()} Damned Community. All rights reserved.</p>
                </footer>
              </div>
              <Toaster
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border)",
                  },
                }}
              />
            </SocketProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
