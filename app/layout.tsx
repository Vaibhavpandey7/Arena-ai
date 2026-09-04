import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Arena",
  description: "Multi-model LLM evaluation and comparison tool with insurance data pipeline backend",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Anti-flash theme script — runs before hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('ai-arena-theme');
                if (t) document.documentElement.setAttribute('data-theme', t);
                else if (window.matchMedia('(prefers-color-scheme: light)').matches)
                  document.documentElement.setAttribute('data-theme', 'light');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
