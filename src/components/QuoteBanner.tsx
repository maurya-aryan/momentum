interface QuoteBannerProps {
  text: string;
  author?: string;
  explanation: string;
}

export default function QuoteBanner({ text, author, explanation }: QuoteBannerProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 p-6 text-white shadow-sm">
      <p className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight">
        &ldquo;{text}&rdquo;
      </p>
      {author && <p className="mt-2 text-sm font-medium text-neutral-400">— {author}</p>}
      <p className="mt-4 text-sm text-neutral-300 leading-relaxed border-t border-neutral-700 pt-3">
        {explanation}
      </p>
    </div>
  );
}
