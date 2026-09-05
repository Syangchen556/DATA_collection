import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TriCapture — BSL Multi-view Recorder',
  description: 'Synchronized three-phone video and MediaPipe landmark collection for sign-language datasets.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
