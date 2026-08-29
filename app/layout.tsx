import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rekall-IQ | Your Company Knowledge. AI-Powered Answers.",
  description:
    "Turn approved company documents into a secure AI assistant. Teams get instant, sourced answers from policies, handbooks, and procedures. No credit card required.",
  icons: {
    icon: [
      { url: "/brand/rekall-logo.png", type: "image/png" },
      { url: "/brand/rekall-mark.jpeg", type: "image/jpeg", sizes: "512x512" },
    ],
    shortcut: ["/brand/rekall-logo.png"],
    apple: [{ url: "/brand/rekall-mark.jpeg", type: "image/jpeg" }],
  },
  openGraph: {
    title:
      "Rekall-IQ | Your Company Knowledge. AI-Powered Answers.",
    description:
      "Stop wasting hours searching for policies. Rekall-IQ gives every team a secure AI assistant that answers instantly from approved company documents.",
    url: "https://rekalliq.springvoxsl.com",
    siteName: "Rekall-IQ",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rekall-IQ",
    description:
      "Turn approved company documents into a secure AI assistant for your team.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${inter.className} font-sans`}>
      <body suppressHydrationWarning className="overflow-x-hidden antialiased">
        <TooltipProvider>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                name: "Rekall-IQ",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                description:
                  "Turn approved company documents into a secure AI assistant. Teams get instant, sourced answers from policies, handbooks, and procedures.",
                offers: [
                  {
                    "@type": "Offer",
                    name: "Free",
                    price: "0",
                    priceCurrency: "USD",
                    description:
                      "For teams validating document AI with a controlled workspace.",
                  },
                  {
                    "@type": "Offer",
                    name: "Business",
                    price: "299",
                    priceCurrency: "USD",
                    description:
                      "For organisations rolling out Rekall-IQ across departments.",
                  },
                ],
              }),
            }}
          />
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
