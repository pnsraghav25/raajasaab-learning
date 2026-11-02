import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { LearningProvider } from "@/components/provider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata = {
  title: "raajasaab-learning · Your learning, uninterrupted",
  description: "A calm, focused course library that remembers exactly where you left off.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080b16" },
    { media: "(prefers-color-scheme: light)", color: "#f6f6fb" },
  ],
};

// Applies the saved theme before first paint, so there is no light/dark flash.
const themeScript = `try{var t=JSON.parse(localStorage.getItem("theme"));document.documentElement.classList.toggle("dark",t!=="light")}catch(e){document.documentElement.classList.add("dark")}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <LearningProvider>{children}</LearningProvider>
      </body>
    </html>
  );
}
