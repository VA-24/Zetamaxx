import "./globals.css";

export const metadata = {
  title: "Zetamaxx",
  description: "Zetamac but multiplayer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
