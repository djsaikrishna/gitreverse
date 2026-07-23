import ReactMarkdown from "react-markdown";

/** Turn bare http(s) URLs into markdown links for display only. */
function linkifyBareUrls(text: string): string {
  return text.replace(/(?<!\]\()(https?:\/\/[^\s<>)]+)/g, (url) => `[${url}](${url})`);
}

export function PromptMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children: c }) => (
          <h1 className="mb-2 mt-4 text-base font-bold first:mt-0">{c}</h1>
        ),
        h2: ({ children: c }) => (
          <h2 className="mb-2 mt-4 text-sm font-bold first:mt-0">{c}</h2>
        ),
        h3: ({ children: c }) => (
          <h3 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{c}</h3>
        ),
        p: ({ children: c }) => <p className="mb-2 last:mb-0">{c}</p>,
        ul: ({ children: c }) => (
          <ul className="mb-2 ml-4 list-disc space-y-0.5">{c}</ul>
        ),
        ol: ({ children: c }) => (
          <ol className="mb-2 ml-4 list-decimal space-y-0.5">{c}</ol>
        ),
        li: ({ children: c }) => <li className="leading-relaxed">{c}</li>,
        strong: ({ children: c }) => (
          <strong className="font-semibold">{c}</strong>
        ),
        em: ({ children: c }) => <em className="italic">{c}</em>,
        code: ({ children: c }) => (
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">
            {c}
          </code>
        ),
        pre: ({ children: c }) => (
          <pre className="mb-2 overflow-auto rounded bg-zinc-100 p-3 font-mono text-xs">
            {c}
          </pre>
        ),
        hr: () => <hr className="my-3 border-zinc-200" />,
        blockquote: ({ children: c }) => (
          <blockquote className="border-l-2 border-zinc-300 pl-3 text-zinc-600">
            {c}
          </blockquote>
        ),
        a: ({ href, children: c }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-900 underline decoration-zinc-400 underline-offset-2"
          >
            {c}
          </a>
        ),
      }}
    >
      {linkifyBareUrls(children)}
    </ReactMarkdown>
  );
}
