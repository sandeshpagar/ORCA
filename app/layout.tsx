import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ORCA · ISRO Marine AI & Coastal Safety",
    template: "%s · ORCA Marine AI",
  },
  description:
    "Mission-critical Indian coastal safety intelligence grid, automated multilingual fisherfolk advisories, and satellite oceanographic analytics.",
  keywords: [
    "ORCA",
    "ISRO",
    "INCOIS",
    "Marine AI",
    "Coastal Safety",
    "Oceanography",
    "Fisherfolk Advisory",
    "Wave Heights",
    "High Wave Alert",
  ],
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "ORCA · ISRO Marine AI & Coastal Safety Grid",
    description:
      "Mission-critical coastal safety intelligence, real-time wave/ocean metrics, and automated vernacular advisories for Indian mariners.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full w-full overflow-hidden`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;500;600;700&family=Noto+Sans+Oriya:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;500;600;700&family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-body-md text-on-surface flex flex-col h-screen h-[100dvh] w-full overflow-hidden m-0 p-0">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

