import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host = incomingHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const image = `${protocol}://${host}/og-fuchen.png`;
  const title = "付晨，七夕快乐 · 今夜星河只为你";
  const description = "送给付晨的一束玫瑰、一场烟火与一本会旋转的回忆相册。";

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
