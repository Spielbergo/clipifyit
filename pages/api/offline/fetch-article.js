// Fetches a URL server-side and extracts readable text and alt attributes.
// NOTE: Keep simple: return page title, textContent (stripped), and a list of image alts.

import { JSDOM } from 'jsdom';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Missing url' });

    // Check if this is likely a PDF URL
    const isPdfUrl = /\.pdf(\?|#|$)/i.test(url);
    
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) return res.status(400).json({ error: `Fetch failed (${response.status})` });
    
    // Check content type for PDF
    const contentType = response.headers.get('content-type') || '';
    const isPdfContent = contentType.includes('application/pdf');
    
    if (isPdfUrl || isPdfContent) {
      // Simple PDF handling - inform user that PDF text extraction is not yet available
      const title = url.split('/').pop()?.replace(/\.pdf$/i, '') || 'PDF Document';
      const text = `PDF Document: ${title}\n\nThis PDF has been saved as a reference. Click the link below to view the original document.`;
      const html = `
        <div style="text-align: center; padding: 40px; border: 2px solid #555; border-radius: 8px; margin: 20px 0; background: #333; color: #fff;">
          <h3 style="color: #fff; margin-top: 0;">📄 PDF Document</h3>
          <p><strong>${title}</strong></p>
          <p>This PDF has been saved as a reference in your offline articles.</p>
          <p>To view the full document, click the link below:</p>
          <br>
          <a href="${url}" target="_blank" rel="noopener noreferrer" style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            📥 Open PDF Document
          </a>
          <br><br>
          <p style="font-size: 12px; color: #ccc; margin-top: 16px; margin-bottom: 0;">
            Note: PDF text extraction will be added in a future update.
          </p>
        </div>
      `;
      
      return res.status(200).json({ 
        title: `📄 ${title}`, 
        html, 
        text, 
        alts: [], 
        fetchedAt: Date.now(), 
        source: url,
        isPdf: true
      });
    }

  const html = await response.text();

    // Title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    // Remove unsafe blocks, navigation, and footer first
    let body = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[\s\S]*?<\/embed>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<!--([\s\S]*?)-->/g, '');

    // Try to focus on <body> content
    const bodyMatch = body.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) body = bodyMatch[1];

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
