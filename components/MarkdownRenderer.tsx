import React from 'react';
import katex from 'katex';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // 1. Split by Block Math: $$ ... $$
  // The regex captures the delimiter and content: (\$\$[\s\S]*?\$\$)
  const parts = content.split(/(\$\$[\s\S]*?\$\$)/g);

  return (
    <div className="leading-relaxed space-y-2 w-full">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // It's a Math Block
          const tex = part.slice(2, -2).trim();
          return <LatexBlock key={index} tex={tex} />;
        }
        
        // It's regular text (which might contain inline math or markdown)
        // We process this paragraph by paragraph
        if (!part.trim()) return null;

        return <TextParagraph key={index} text={part} />;
      })}
    </div>
  );
};

const LatexBlock: React.FC<{ tex: string }> = ({ tex }) => {
  try {
    const html = katex.renderToString(tex, { 
      displayMode: true, 
      throwOnError: false,
      output: 'html' // Render html directly
    });
    return <div dangerouslySetInnerHTML={{ __html: html }} className="my-2 select-text text-center" />;
  } catch (error) {
    return <code className="block bg-red-50 p-2 text-red-600 text-sm">{tex}</code>;
  }
};

const TextParagraph: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  
  return (
    <>
      {lines.map((line, i) => {
        if (line.trim() === '') return <div key={i} className="h-2" />;

        // Handle Bullet Points
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
             return (
               <li key={i} className="ml-4 list-disc marker:opacity-50">
                  <FormattedLine text={line.trim().substring(2)} />
               </li>
             )
        }
        // Handle Ordered Lists (simple 1. detection)
        if (/^\d+\.\s/.test(line.trim())) {
             const content = line.trim().replace(/^\d+\.\s/, '');
             return (
               <div key={i} className="flex gap-2 ml-1">
                   <span className="font-bold opacity-60 text-sm mt-0.5">{line.trim().split(' ')[0]}</span>
                   <div><FormattedLine text={content} /></div>
               </div>
             )
        }
        
        return (
          <p key={i} className="mb-1 last:mb-0">
            <FormattedLine text={line} />
          </p>
        );
      })}
    </>
  );
};

const FormattedLine: React.FC<{ text: string }> = ({ text }) => {
  // 1. Split by Inline Math: $ ... $
  // Regex: /(\$.*?\$)/g  (Non-greedy match)
  const parts = text.split(/(\$[^$]+?\$)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const tex = part.slice(1, -1);
          try {
             const html = katex.renderToString(tex, { 
                 displayMode: false, 
                 throwOnError: false 
             });
             return <span key={i} dangerouslySetInnerHTML={{ __html: html }} className="select-text" />;
          } catch (e) {
             return <code key={i} className="text-red-500">{part}</code>;
          }
        }
        return <FormattedText key={i} text={part} />;
      })}
    </>
  );
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  // 1. Split by Code (backticks) - Highest priority to prevent formatting inside code
  const parts = text.split(/(`[^`]+?`)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              className="bg-black/5 px-1.5 py-0.5 rounded text-sm font-mono border border-black/10"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        // Process text for Bold and Italic
        return <FormattedStyleText key={i} text={part} />;
      })}
    </>
  );
};

const FormattedStyleText: React.FC<{ text: string }> = ({ text }) => {
  // 2. Split by Bold (**...**)
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        // 3. Split by Italic (*...*)
        const subParts = part.split(/(\*[^*]+?\*)/g);
        return (
          <span key={i}>
            {subParts.map((subPart, j) => {
              if (
                subPart.startsWith('*') &&
                subPart.endsWith('*') &&
                subPart.length > 2
              ) {
                return (
                  <em key={j} className="italic">
                    {subPart.slice(1, -1)}
                  </em>
                );
              }
              return subPart;
            })}
          </span>
        );
      })}
    </>
  );
};

export default MarkdownRenderer;