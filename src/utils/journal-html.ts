/**
 * Remove common author/byline blocks from journal HTML (CMS paste, WP-style blocks).
 * Keeps normal body copy; only targets short standalone byline paragraphs and author widgets.
 */
export function stripJournalAuthorBylines(html: string): string {
  if (!html || typeof html !== "string") return html;

  let out = html;

  // WordPress / block-style author widgets
  out = out.replace(/<div[^>]*class="[^"]*wp-block-post-author[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  out = out.replace(/<div[^>]*class="[^"]*author-box[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");

  // Short paragraphs that are only an attribution line (EN / ID)
  const bylineParagraph = /<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi;
  out = out.replace(bylineParagraph, (full, _attrs, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text.length > 140) return full;
    if (/^by\s+\S+/i.test(text)) return "";
    if (/^oleh\s+\S+/i.test(text)) return "";
    return full;
  });

  return out;
}
