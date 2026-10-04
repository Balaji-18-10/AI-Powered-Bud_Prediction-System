import React, { useState } from 'react';
import { Copy, Check, FileCode, Maximize2, Minimize2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface CodePreviewProps {
  code: string;
  fileName?: string;
  fileType?: string;
  maxHeight?: string;
}

export const CodePreview: React.FC<CodePreviewProps> = ({
  code,
  fileName = 'source_code',
  fileType = 'code',
  maxHeight = 'max-h-96',
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const toast = useToast();

  const lines = code.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code Copied', `${fileName} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
      toast.error('Copy Failed', 'Unable to access clipboard');
    }
  };

  const getLanguageColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'java':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900';
      case 'py':
      case 'python':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900';
      case 'cpp':
      case 'c++':
        return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900';
      case 'c':
        return 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-900';
      default:
        return 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  // Simple token highlighter for keywords, comments, and strings
  const highlightSyntax = (lineText: string, lang: string) => {
    const trimmed = lineText.trim();
    // Comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return <span className="text-emerald-400 italic">{lineText}</span>;
    }

    // Split words and match keywords
    const keywordsPython = new Set(['def', 'class', 'import', 'from', 'if', 'elif', 'else', 'for', 'while', 'return', 'try', 'except', 'with', 'as', 'in', 'and', 'or', 'not', 'is', 'lambda', 'async', 'await', 'True', 'False', 'None']);
    const keywordsCJava = new Set(['public', 'private', 'protected', 'static', 'final', 'void', 'class', 'struct', 'int', 'double', 'float', 'char', 'bool', 'boolean', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'return', 'new', 'this', 'package', 'include', 'const', 'auto', 'virtual', 'override', 'null', 'true', 'false']);

    const isPy = lang === 'py' || lang === 'python';
    const keywordSet = isPy ? keywordsPython : keywordsCJava;

    const parts = lineText.split(/([a-zA-Z_]\w*|"[^"]*"|'[^']*'|\/\/.*$|#.*$)/g);

    return parts.map((part, idx) => {
      if (!part) return null;
      if (part.startsWith('//') || part.startsWith('#')) {
        return <span key={idx} className="text-emerald-400 italic">{part}</span>;
      }
      if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
        return <span key={idx} className="text-amber-300">{part}</span>;
      }
      if (keywordSet.has(part)) {
        return <span key={idx} className="text-violet-400 font-semibold">{part}</span>;
      }
      if (/^\d+(\.\d+)?$/.test(part)) {
        return <span key={idx} className="text-cyan-400">{part}</span>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-xl overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <FileCode className="h-4 w-4 text-indigo-400" />
          <span className="font-mono font-bold text-slate-200 truncate max-w-xs">
            {fileName}
          </span>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${getLanguageColor(fileType)}`}>
            {fileType}
          </span>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            {lines.length} lines
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse viewer' : 'Expand viewer'}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors text-xs font-semibold cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Area with Line Numbers */}
      <div
        className={`overflow-auto font-mono text-xs p-5 select-text transition-all ${
          isExpanded ? 'max-h-[600px]' : maxHeight
        }`}
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-900/60 leading-relaxed">
                <td className="pr-5 text-right select-none text-slate-600 w-10 text-[11px]">
                  {idx + 1}
                </td>
                <td className="whitespace-pre text-slate-200 font-mono">
                  {highlightSyntax(line, fileType)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
