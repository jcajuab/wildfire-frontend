import { sanitizeRichTextHtml } from "@/lib/content-thumbnail-preview";

type DisplayTextContentProps = {
  html: string;
};

export function DisplayTextContent({ html }: DisplayTextContentProps) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-white p-8">
      <div
        className="display-text-table w-full max-w-full text-7xl leading-relaxed text-black [overflow-wrap:anywhere] [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_em]:italic [&_li]:list-item [&_ol]:list-decimal [&_ol]:pl-[1.5em] [&_p]:my-2 [&_strong]:font-bold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-[1.5em] [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:font-bold"
        dangerouslySetInnerHTML={{
          __html: sanitizeRichTextHtml(html),
        }}
      />
    </div>
  );
}
