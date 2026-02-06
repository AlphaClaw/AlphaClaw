import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";
import { truncateText } from "../utils/format";

marked.setOptions({ gfm: true, breaks: true });

const allowedTags = [
  "a","b","blockquote","br","code","del","em","h1","h2","h3","h4","hr",
  "i","li","ol","p","pre","strong","table","tbody","td","th","thead","tr","ul",
];
const allowedAttrs = ["class", "href", "rel", "target", "title", "start"];

let hooksInstalled = false;
const MARKDOWN_CHAR_LIMIT = 140_000;
const MARKDOWN_PARSE_LIMIT = 40_000;
const MARKDOWN_CACHE_LIMIT = 200;
const MARKDOWN_CACHE_MAX_CHARS = 50_000;
const markdownCache = new Map<string, string>();

function getCached(key: string): string | null {
  const cached = markdownCache.get(key);
  if (cached === undefined) return null;
  markdownCache.delete(key);
  markdownCache.set(key, cached);
  return cached;
}

function setCache(key: string, value: string) {
  markdownCache.set(key, value);
  if (markdownCache.size > MARKDOWN_CACHE_LIMIT) {
    const oldest = markdownCache.keys().next().value;
    if (oldest) markdownCache.delete(oldest);
  }
}

function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!(node instanceof HTMLAnchorElement)) return;
    const href = node.getAttribute("href");
    if (!href) return;
    node.setAttribute("rel", "noreferrer noopener");
    node.setAttribute("target", "_blank");
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function toSanitizedMarkdownHtml(markdown: string): string {
  const input = markdown.trim();
  if (!input) return "";
  installHooks();
  if (input.length <= MARKDOWN_CACHE_MAX_CHARS) {
    const cached = getCached(input);
    if (cached !== null) return cached;
  }
  const truncated = truncateText(input, MARKDOWN_CHAR_LIMIT);
  const suffix = truncated.truncated
    ? `\n\n… truncated (${truncated.total} chars, showing first ${truncated.text.length}).`
    : "";
  if (truncated.text.length > MARKDOWN_PARSE_LIMIT) {
    const escaped = escapeHtml(`${truncated.text}${suffix}`);
    const html = `<pre class="code-block">${escaped}</pre>`;
    const sanitized = DOMPurify.sanitize(html, { ALLOWED_TAGS: allowedTags, ALLOWED_ATTR: allowedAttrs });
    if (input.length <= MARKDOWN_CACHE_MAX_CHARS) setCache(input, sanitized);
    return sanitized;
  }
  const rendered = marked.parse(`${truncated.text}${suffix}`) as string;
  const sanitized = DOMPurify.sanitize(rendered, { ALLOWED_TAGS: allowedTags, ALLOWED_ATTR: allowedAttrs });
  if (input.length <= MARKDOWN_CACHE_MAX_CHARS) setCache(input, sanitized);
  return sanitized;
}

export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => toSanitizedMarkdownHtml(content), [content]);
  return (
    <div
      className={className ?? "prose prose-sm prose-invert max-w-none"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
