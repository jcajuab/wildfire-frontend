import type { Metadata } from "next";
import type { ReactNode } from "react";

interface Props {
  params: Promise<{ displaySlug: string }>;
  children: ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { displaySlug } = await params;
  const title = displaySlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title,
    description: `Live display: ${title}`,
  };
}

export default function DisplayLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <div data-force-light className="h-screen w-screen">
      {children}
    </div>
  );
}
