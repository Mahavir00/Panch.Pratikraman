import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Render trusted, repo-authored markdown (the tradition KB) in the sacred prose style. */
export function MarkdownView({ children }: { children: string }) {
  return (
    <div className="prose-sacred max-w-none">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  )
}
