import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DIL Intelligence Studio",
  description: "Next-generation multi-model LLM benchmark and evaluation studio for insurance, Solvency II directives, and actuarial intelligence",
  icons: {
    icon: "/dil-logo.png",
    shortcut: "/dil-logo.png",
    apple: "/dil-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <link rel="icon" href="/dil-logo.png" />
        {/* ── DNS prefetch for faster external resource resolution ── */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/*
          Non-render-blocking font load:
          - rel="preload" + as="style" starts downloading the CSS early
          - onload switches rel to "stylesheet" once downloaded (non-blocking)
          - <noscript> is the fallback for users with JS disabled
          This eliminates the render-blocking stylesheet that was delaying FCP.
        */}
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          // @ts-expect-error — onload is valid for preload links
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          />
        </noscript>

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
