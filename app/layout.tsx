import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host = incomingHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const image = `${protocol}://${host}/og.png`;
  const title = "七夕快乐 · 今夜星河只为你";
  const description = "一束玫瑰，一册回忆，愿朝朝暮暮皆是你。";

  return {
    title,
    description,
    icons: { icon: "/favicon-small.png", shortcut: "/favicon-small.png" },
    openGraph: { title, description, images: [{ url: image, width: 1728, height: 909 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
