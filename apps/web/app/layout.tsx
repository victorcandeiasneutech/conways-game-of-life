import './global.css';

export const metadata = {
  title: "Conway's Game of Life",
  description: 'An interactive Conway\'s Game of Life simulation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-white">{children}</body>
    </html>
  );
}
