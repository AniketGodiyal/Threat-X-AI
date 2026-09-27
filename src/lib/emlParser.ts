import type { EmailData, RelayHop } from './sampleEmails';
export type { EmailData };

function parseHeaders(headerText: string): Record<string, string[]> {
  const headers: Record<string, string[]> = {};
  const lines = headerText.split('\n');

  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && currentKey) {
      currentValue += ' ' + line.trim();
    } else {
      if (currentKey) {
        if (!headers[currentKey]) headers[currentKey] = [];
        headers[currentKey].push(currentValue);
      }
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        currentKey = line.substring(0, colonIdx).trim().toLowerCase();
        currentValue = line.substring(colonIdx + 1).trim();
      } else {
        currentKey = '';
        currentValue = '';
      }
    }
  }
  if (currentKey) {
    if (!headers[currentKey]) headers[currentKey] = [];
    headers[currentKey].push(currentValue);
  }

  return headers;
}

function extractEmail(fromValue: string): { email: string; name: string } {
  const nameMatch = fromValue.match(/^"?([^"<]*?)"?\s*<([^>]+)>/);
  if (nameMatch) {
    return { name: nameMatch[1].trim(), email: nameMatch[2].trim() };
  }
  const emailMatch = fromValue.match(/([^\s<>]+@[^\s<>]+)/);
  if (emailMatch) {
    return { email: emailMatch[1].trim(), name: '' };
  }
  return { email: fromValue.trim(), name: '' };
}

function extractIP(text: string): string {
  const ipMatch = text.match(/\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/);
  if (ipMatch) return ipMatch[1];
  const ipMatch2 = text.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  if (ipMatch2) return ipMatch2[1];
  return 'Unknown';
}

function parseReceivedHeader(header: string, hopNumber: number): RelayHop {
  const fromMatch = header.match(/from\s+(.+?)\s+by\s+/i);
  const from = fromMatch ? fromMatch[1].trim() : 'Unknown';

  const byMatch = header.match(/by\s+(.+?)(\s+with\s+|\s+for\s+|;)/i);
  const by = byMatch ? byMatch[1].trim() : 'Unknown';

  const withMatch = header.match(/with\s+(\S+)/i);
  const protocol = withMatch ? withMatch[1].trim() : 'SMTP';

  const withParamMatch = header.match(/with\s+(.+?)(\s+for\s+|;|$)/i);
  const withParam = withParamMatch ? withParamMatch[1].trim() : protocol;

  const ip = extractIP(header);

  const timestampMatch = header.match(/;\s*(.+)/);
  const timestamp = timestampMatch ? timestampMatch[1].trim() : 'Unknown';

  return { hop: hopNumber, from, by, protocol, ip, timestamp, withParam, delay: 'N/A' };
}

function calculateDelays(hops: RelayHop[]): void {
  for (let i = 0; i < hops.length; i++) {
    if (i === 0) {
      hops[i].delay = 'Origin';
    } else {
      const prevTime = Date.parse(hops[i - 1].timestamp);
      const currTime = Date.parse(hops[i].timestamp);
      if (!isNaN(prevTime) && !isNaN(currTime)) {
        const diff = Math.round((currTime - prevTime) / 1000);
        hops[i].delay = diff >= 0 ? `+${diff}s` : `${diff}s`;
      } else {
        hops[i].delay = 'N/A';
      }
    }
  }
}

function parseAuthResults(headers: Record<string, string[]>): { spf: string; dkim: string; dmarc: string } {
  const authResults = headers['authentication-results']?.join(' ') || '';
  const receivedSpf = headers['received-spf']?.[0] || '';

  let spf = 'Unknown — no Authentication-Results header found';
  let dkim = 'Unknown — no Authentication-Results header found';
  let dmarc = 'Unknown — no Authentication-Results header found';

  if (authResults) {
    const spfMatch = authResults.match(/spf=(\w+)/i);
    if (spfMatch) {
      const result = spfMatch[1].toLowerCase();
      const detail = authResults.match(/spf=\w+\s*\(([^)]+)\)/i)?.[1] || '';
      spf = result === 'pass'
        ? `PASS — ${detail || 'SPF validated'}`
        : `FAIL — ${detail || 'SPF validation failed'}`;
    }

    const dkimMatch = authResults.match(/dkim=(\w+)/i);
    if (dkimMatch) {
      const result = dkimMatch[1].toLowerCase();
      const detail = authResults.match(/dkim=\w+\s*\(([^)]+)\)/i)?.[1] || '';
      dkim = result === 'pass'
        ? `PASS — ${detail || 'DKIM signature verified'}`
        : `FAIL — ${detail || 'DKIM signature verification failed'}`;
    }

    const dmarcMatch = authResults.match(/dmarc=(\w+)/i);
    if (dmarcMatch) {
      const result = dmarcMatch[1].toLowerCase();
      const detail = authResults.match(/dmarc=\w+\s*\(([^)]+)\)/i)?.[1] || '';
      dmarc = result === 'pass'
        ? `PASS — ${detail || 'DMARC policy satisfied'}`
        : `FAIL — ${detail || 'DMARC policy violated'}`;
    }
  } else if (receivedSpf) {
    const spfResult = receivedSpf.toLowerCase().startsWith('pass') ? 'PASS' : 'FAIL';
    spf = `${spfResult} — ${receivedSpf}`;
  }

  return { spf, dkim, dmarc };
}

function decodeContent(content: string, encoding: string): string {
  encoding = encoding.toLowerCase().trim();
  if (encoding === 'base64') {
    try {
      return atob(content.replace(/\s/g, ''));
    } catch {
      return content;
    }
  }
  if (encoding === 'quoted-printable') {
    return content
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
  return content;
}

function isLinkSuspicious(url: string, displayText: string, fromDomain: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (urlObj.protocol === 'http:') return true;
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (url.includes('@') && !url.startsWith('mailto:')) return true;

    if (fromDomain && !hostname.includes(fromDomain)) {
      const displayLower = displayText.toLowerCase();
      const displayUrlMatch = displayLower.match(/https?:\/\/([^\s/<]+)/);
      if (displayUrlMatch && displayUrlMatch[1] !== hostname) return true;
      return true;
    }

    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.g.g', 'buff.ly'];
    if (shorteners.some(s => hostname.includes(s))) return true;

    if (hostname.split('.').length > 4) return true;

    return false;
  } catch {
    return true;
  }
}

function extractLinksFromHTML(html: string, fromDomain: string): EmailData['links'] {
  const links: EmailData['links'] = [];
  const hrefRegex = /href\s*=\s*["']([^"']+)["'][^>]*>([^<]*)/gi;
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    const url = match[1].trim();
    const text = match[2].trim();
    if (!url || url.startsWith('mailto:') || url.startsWith('#') || url.startsWith('tel:')) continue;
    const suspicious = isLinkSuspicious(url, text, fromDomain);
    links.push({ url, text, suspicious, redirect: false });
  }

  return links;
}

function extractLinksFromText(text: string, fromDomain: string): EmailData['links'] {
  const links: EmailData['links'] = [];
  const urlRegex = /https?:\/\/[^\s<>"']+/gi;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0].trim();
    const suspicious = isLinkSuspicious(url, url, fromDomain);
    links.push({ url, text: url, suspicious, redirect: false });
  }

  return links;
}

function isAttachmentSuspicious(filename: string): boolean {
  const suspiciousExtensions = ['.html', '.htm', '.exe', '.scr', '.bat', '.cmd', '.js', '.jar', '.vbs', '.ps1', '.msi', '.com', '.pif', '.zip', '.rar'];
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  if (suspiciousExtensions.includes(ext)) return true;
  if (filename.split('.').length - 1 > 1) return true;
  return false;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MimeParseResult {
  textBody: string;
  htmlBody: string;
  attachments: EmailData['attachments'];
}

function parseMimeParts(body: string, contentType: string, boundary: string): MimeParseResult {
  let textBody = '';
  let htmlBody = '';
  const attachments: EmailData['attachments'] = [];

  if (!boundary) {
    if (contentType.includes('text/html')) {
      htmlBody = body;
    } else {
      textBody = body;
    }
    return { textBody, htmlBody, attachments };
  }

  const escapedBoundary = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = body.split(new RegExp(`--${escapedBoundary}(?:--)?\\r?\\n?`));

  for (const part of parts) {
    if (!part.trim()) continue;

    const headerEnd = part.indexOf('\n\n') >= 0 ? part.indexOf('\n\n') : part.indexOf('\r\n\r\n');
    if (headerEnd < 0) continue;

    const partHeaderText = part.substring(0, headerEnd);
    const partBody = part.substring(headerEnd + (part.includes('\r\n\r\n') ? 4 : 2));
    const partHeaders = parseHeaders(partHeaderText);

    const partContentType = partHeaders['content-type']?.[0] || 'text/plain';
    const contentDisposition = partHeaders['content-disposition']?.[0] || '';
    const encoding = partHeaders['content-transfer-encoding']?.[0] || '';

    const filenameMatch = (contentDisposition + ' ' + (partHeaders['content-type']?.[0] || ''))
      .match(/filename\s*=\s*"?([^";\n]+)"?/i);
    const filename = filenameMatch ? filenameMatch[1].trim() : '';

    const decodedBody = decodeContent(partBody.trim(), encoding);

    if (contentDisposition.includes('attachment') || (filename && !partContentType.includes('text/plain') && !partContentType.includes('text/html'))) {
      if (filename) {
        const suspicious = isAttachmentSuspicious(filename);
        const size = formatSize(new Blob([decodedBody]).size);
        attachments.push({ name: filename, type: partContentType.split(';')[0].trim(), suspicious, size });
      }
    } else if (partContentType.includes('text/html')) {
      htmlBody += decodedBody;
    } else if (partContentType.includes('text/plain')) {
      textBody += decodedBody;
    } else if (partContentType.includes('multipart/')) {
      const nestedBoundaryMatch = partContentType.match(/boundary\s*=\s*["']?([^"';\n]+)["']?/i);
      if (nestedBoundaryMatch) {
        const nested = parseMimeParts(partBody, partContentType, nestedBoundaryMatch[1].trim());
        textBody += nested.textBody;
        htmlBody += nested.htmlBody;
        attachments.push(...nested.attachments);
      }
    }
  }

  return { textBody, htmlBody, attachments };
}

export function parseEml(rawText: string): EmailData {
  const text = rawText.replace(/\r\n/g, '\n');

  const headerEnd = text.indexOf('\n\n');
  const headerText = headerEnd >= 0 ? text.substring(0, headerEnd) : text;
  const body = headerEnd >= 0 ? text.substring(headerEnd + 2) : '';

  const headers = parseHeaders(headerText);

  const fromRaw = headers['from']?.[0] || 'Unknown <unknown@unknown>';
  const { email: fromEmail, name: fromNameRaw } = extractEmail(fromRaw);
  const fromName = fromNameRaw || fromEmail.split('@')[0] || fromEmail;

  const toRaw = headers['to']?.[0] || '';
  const { email: toEmail } = extractEmail(toRaw);

  const subject = headers['subject']?.[0] || '(No Subject)';
  const date = headers['date']?.[0] || 'Unknown';
  const returnPathRaw = headers['return-path']?.[0] || fromEmail;
  const replyToRaw = headers['reply-to']?.[0] || fromEmail;
  const messageId = headers['message-id']?.[0] || 'Unknown';

  const receivedHeaders = headers['received'] || [];

  const relayHops = receivedHeaders
    .map((header, i) => parseReceivedHeader(header, receivedHeaders.length - i))
    .reverse();
  calculateDelays(relayHops);

  const { spf, dkim, dmarc } = parseAuthResults(headers);

  const domain = fromEmail.split('@')[1] || 'Unknown';
  const originatingIP = relayHops.length > 0 ? relayHops[0].ip : 'Unknown';

  const contentType = headers['content-type']?.[0] || 'text/plain';
  const boundaryMatch = contentType.match(/boundary\s*=\s*["']?([^"';\n]+)["']?/i);
  const boundary = boundaryMatch ? boundaryMatch[1].trim() : '';

  const { textBody, htmlBody, attachments } = parseMimeParts(body, contentType, boundary);

  const links = htmlBody
    ? extractLinksFromHTML(htmlBody, domain)
    : extractLinksFromText(textBody, domain);

  const bodyContent = textBody || htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    from: fromEmail,
    fromName,
    to: toEmail || 'Unknown',
    subject,
    date,
    returnPath: extractEmail(returnPathRaw).email,
    replyTo: extractEmail(replyToRaw).email,
    messageId,
    receivedHeaders,
    relayHops,
    dkim,
    spf,
    dmarc,
    body: bodyContent,
    originatingIP,
    geoIP: originatingIP,
    geoCity: 'Not available from email headers',
    geoRegion: 'Not available',
    geoCountry: 'Not available',
    geoLat: 0,
    geoLon: 0,
    geoISP: 'Not available from email headers',
    geoOrg: 'Not available',
    geoTimezone: 'Not available',
    geoASN: 'Not available',
    domain,
    domainAge: 'Not available from email headers',
    domainRegistrar: 'Not available from email headers',
    domainNS: 'Not available from email headers',
    domainMX: 'Not available from email headers',
    links,
    attachments,
  };
}
