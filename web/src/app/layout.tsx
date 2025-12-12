import type { Metadata } from "next";
import { Marcellus, Tenor_Sans } from "next/font/google";
import "./globals.css";

const marcellus = Marcellus({
  weight: "400",
  variable: "--font-marcellus",
  subsets: ["latin"],
});

const tenor = Tenor_Sans({
  weight: "400",
  variable: "--font-tenor",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FINALWISHES | The Estate Operating System",
  description: "Your Legacy Deserves a Guardian",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${marcellus.variable} ${tenor.variable} antialiased font-tenor`}
      >
        {children}
      </body>
    </html>
  );
}
