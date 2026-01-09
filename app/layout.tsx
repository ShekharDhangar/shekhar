import type { Metadata } from "next"
import { EB_Garamond, Noto_Sans } from "next/font/google"
import "./globals.css"
import { MovingBackground } from "@/components/moving-background"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const notoSans = Noto_Sans({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-noto-sans"
})

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-eb-garamond",
})

export const metadata: Metadata = {
  title: "Shekhar Dhangar",
  icons: {
    icon: "/favicon.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (!theme && supportDarkMode) theme = 'dark';
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${notoSans.variable} ${ebGaramond.variable}`}>
        <ThemeToggle />
        <MovingBackground />
        {children}
      </body>
    </html>
  )
}

