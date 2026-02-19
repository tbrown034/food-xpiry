import "./globals.css";
import Header from "./components/layout/Header";
import Providers from "./Providers";
import { DM_Serif_Display, DM_Sans, Caveat } from "next/font/google";

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Food Xpiry",
  description: "Track groceries, reduce waste, save money",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${dmSerifDisplay.variable} ${dmSans.variable} ${caveat.variable} antialiased min-h-screen flex flex-col`}
        style={{ backgroundColor: "var(--color-cream-100)" }}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-white"
          style={{ backgroundColor: 'var(--color-sage-600)' }}
        >
          Skip to content
        </a>
        <Providers>
          <Header />
          <main id="main-content" className="flex-1 flex flex-col overflow-hidden">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
