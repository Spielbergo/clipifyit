// Fetches a URL server-side and extracts readable text and alt attributes.
// NOTE: Keep simple: return page title, textContent (stripped), and a list of image alts.

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Missing url' });

    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) return res.status(400).json({ error: `Fetch failed (${response.status})` });
  const html = await response.text();

    // Title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    // Try Readability extraction first to isolate article content
    let articleHTML = '';
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      if (article && article.content) {
        articleHTML = article.content; // already a fragment of HTML for the article body
      }
    } catch (_e) {
      // fallback below
    }

    // Remove unsafe blocks first (on extracted or full body fallback)
    let body = (articleHTML || html)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[\s\S]*?<\/embed>/gi, '')
      .replace(/<!--([\s\S]*?)-->/g, '');

    // If not using Readability, try to focus on <body>
    if (!articleHTML) {
      const bodyMatch = body.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) body = bodyMatch[1];
    }

    // Whitelist tags and strip attributes (except anchor href)
    const allowed = new Set(['a','p','br','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code','strong','em','b','i','hr']);
    const base = new URL(url);

    function sanitizeHref(raw) {
      try {
        if (!raw) return null;
        const trimmed = String(raw).trim().replace(/"/g, '').replace(/'/g, '');
        // Disallow javascript: and data:
        if (/^(javascript:|data:)/i.test(trimmed)) return null;
        // Resolve relative URLs
        const abs = new URL(trimmed, base).toString();
        if (!/^https?:\/\//i.test(abs)) return null;
        return abs;
      } catch { return null; }
    }

  const sanitizedHtml = body.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (m, tag, attrs) => {
      const lower = tag.toLowerCase();
      const isClosing = /^<\//.test(m);
      if (!allowed.has(lower)) {
        return ''; // drop disallowed tags entirely
      }
      if (isClosing) {
        return `</${lower}>`;
      }
      if (lower === 'a') {
        // Keep only safe href
        const hrefMatch = attrs && attrs.match(/href\s*=\s*(["'])(.*?)\1/i);
        const hrefVal = hrefMatch ? sanitizeHref(hrefMatch[2]) : null;
        return hrefVal ? `<a href="${hrefVal}" rel="nofollow noopener">` : '<a>';
      }
      // Self-closing formatting for br/hr
      if (lower === 'br' || lower === 'hr') return `<${lower}>`;
      return `<${lower}>`;
    });

    // Also provide a plain text fallback
  const text = sanitizedHtml
      .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li)>/gi, '$&\n')
      .replace(/<br\s*\/?>(\s*)/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Collect alt text from original HTML
  const alts = Array.from(html.matchAll(/<img[^>]*\salt=["']([^"']+)["'][^>]*>/gi)).map(m => m[1]);

    return res.status(200).json({ title, html: sanitizedHtml, text, alts, fetchedAt: Date.now(), source: url });
  } catch (err) {
    console.error('offline fetch error', err);
    return res.status(500).json({ error: 'Failed to fetch article' });
  }
}
