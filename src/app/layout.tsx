import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { Providers } from "@/providers/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SeenOS",
  description: "AI-powered agent interface - Intelligent automation platform",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [
      { url: "icon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "SeenOS",
    description: "AI-powered agent interface - Intelligent automation platform",
    siteName: "SeenOS",
    type: "website",
    images: [
      {
        url: "icon.svg",
        width: 1200,
        height: 630,
        alt: "SeenOS - AI Agent Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SeenOS",
    description: "AI-powered agent interface - Intelligent automation platform",
    images: ["icon.svg"],
  },
};

// 内联脚本防止主题闪烁
const themeScript = `
  (function() {
    try {
      var savedTheme = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = savedTheme || (prefersDark ? 'dark' : 'light');
      var root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-joy-color-scheme', 'dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.setAttribute('data-joy-color-scheme', 'light');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <NuqsAdapter>
          <Providers>
            {children}
          </Providers>
        </NuqsAdapter>
        <Toaster />
      </body>
    </html>
  );
}
