import type { ReactNode } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "../index.css";

export const metadata = {
  title: "Lexeme Practice",
  description: "Practice lexemes with spaced repetition and mnemonics",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
