import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import MotionProviders from "@/components/MotionProviders";

export const metadata = {
  title: "Finsight — Clarity for your money",
  description:
    "AI-Powered Personal Finance and Decision Support Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <MotionProviders>{children}</MotionProviders>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
