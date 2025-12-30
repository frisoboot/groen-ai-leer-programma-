import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Simple parser to handle bolding and newlines safely without external heavy libs
  // Split by newlines
  const lines = content.split('\n');

  return (
    <div className="leading-relaxed text-gray-800 space-y-2">
      {lines.map((line, index) => {
        // Check for bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
           return (
             <li key={index} className="ml-4 list-disc">
                <FormattedText text={line.trim().substring(2)} />
             </li>
           )
        }
        
        // Check for code blocks (simple detection)
        if (line.trim().startsWith('```')) {
            // Simplified: usually code blocks span multiple lines, 
            // but for this simple renderer we'll just ignore the backticks 
            // or style it differently if it was a block.
            // A true markdown parser is complex; this is a lightweight fallback.
            return null; 
        }

        // Basic paragraph
        if (line.trim() === '') {
            return <div key={index} className="h-2"></div>
        }

        return (
          <p key={index}>
            <FormattedText text={line} />
          </p>
        );
      })}
    </div>
  );
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  // Split by bold markers (**)
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-indigo-900">{part.slice(2, -2)}</strong>;
        }
        // Handle code snippets `code`
        const subParts = part.split(/(`.*?`)/g);
        return subParts.map((subPart, j) => {
             if (subPart.startsWith('`') && subPart.endsWith('`')) {
                 return <code key={`${i}-${j}`} className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono text-pink-600">{subPart.slice(1, -1)}</code>
             }
             return subPart;
        })
      })}
    </>
  );
};

export default MarkdownRenderer;
