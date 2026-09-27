import type { EmailData } from './sampleEmails';
import type { AnalysisResult } from './analyzer';
import type { GeoData } from './geoService';

export interface FullReportData {
  email: EmailData;
  result: AnalysisResult;
  geo: GeoData | null;
  portal: 'citizen' | 'law_enforcement';
  caseId: string;
  generatedAt: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function threatColor(score: number): string {
  if (score >= 71) return '#ff3355';
  if (score >= 31) return '#ffaa00';
  return '#00d97e';
}

function statusIcon(status: string): string {
  return status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
}

function generateReportHTML(data: FullReportData): string {
  const { email, result, geo, portal, caseId, generatedAt } = data;
  const color = threatColor(result.riskScore);
  const hasGeo = geo && geo.latitude !== 0 && geo.city !== 'Not available' && geo.city !== 'Private/Local Network';

  const indicatorsHTML = result.indicators.map(ind => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;">${escapeHtml(ind.category)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;">${escapeHtml(ind.label)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;text-align:center;">${statusIcon(ind.status)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;">${escapeHtml(ind.detail)}</td>
    </tr>
  `).join('');

  const linksHTML = email.links.length > 0
    ? email.links.map(l => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-family:monospace;font-size:11px;word-break:break-all;">${escapeHtml(l.url)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;">${escapeHtml(l.text)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;color:${l.suspicious ? '#ff3355' : '#00d97e'};font-weight:bold;">${l.suspicious ? 'SUSPICIOUS' : 'SAFE'}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="3" style="padding:12px;text-align:center;color:#888;">No links found</td></tr>';

  const attachmentsHTML = email.attachments.length > 0
    ? email.attachments.map(a => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-family:monospace;">${escapeHtml(a.name)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;">${escapeHtml(a.type)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;">${escapeHtml(a.size)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;color:${a.suspicious ? '#ff3355' : '#00d97e'};font-weight:bold;">${a.suspicious ? 'SUSPICIOUS' : 'SAFE'}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4" style="padding:12px;text-align:center;color:#888;">No attachments found</td></tr>';

  const relayHopsHTML = email.relayHops.length > 0
    ? email.relayHops.map(hop => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;text-align:center;font-weight:bold;">${hop.hop}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-family:monospace;font-size:11px;">${escapeHtml(hop.from)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-family:monospace;font-size:11px;">${escapeHtml(hop.by)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-family:monospace;font-size:11px;">${escapeHtml(hop.ip)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;">${escapeHtml(hop.protocol)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;">${escapeHtml(hop.delay)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="6" style="padding:12px;text-align:center;color:#888;">No relay hop data available</td></tr>';

  const receivedHeadersHTML = email.receivedHeaders.map((h, i) => `
    <div style="background:#f5f5f5;padding:10px 12px;border-radius:6px;margin-bottom:6px;font-family:monospace;font-size:10px;word-break:break-all;border-left:3px solid #0099ff;">
      <span style="color:#0099ff;font-weight:bold;">[${i}]</span> ${escapeHtml(h)}
    </div>
  `).join('');

  const reasonsHTML = result.reasons.length > 0
    ? result.reasons.map(r => `<li style="margin-bottom:8px;padding-left:8px;">${escapeHtml(r)}</li>`).join('')
    : '<li style="color:#888;">No threat indicators triggered</li>';

  const recommendationsHTML = result.recommendations.map((r, i) => `
    <li style="margin-bottom:8px;padding-left:8px;"><strong>${i + 1}.</strong> ${escapeHtml(r)}</li>
  `).join('');

  const geoSection = portal === 'law_enforcement' ? `
    <div style="margin-top:24px;">
      <h2 style="color:#0099ff;border-bottom:2px solid #0099ff;padding-bottom:6px;margin-bottom:12px;">Geolocation & IP Intelligence</h2>
      ${hasGeo ? `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;width:200px;">Originating IP</td><td style="padding:6px 12px;font-family:monospace;">${escapeHtml(geo.ip)}</td></tr>
          <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;">City</td><td style="padding:6px 12px;">${escapeHtml(geo.city)}</td></tr>
          <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;">Region</td><td style="padding:6px 12px;">${escapeHtml(geo.state_prov)}</td></tr>
          <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;">Country</td><td style="padding:6px 12px;">${escapeHtml(geo.country_name)} (${escapeHtml(geo.country_code2 || '')})</td></tr>
          <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;">Coordinates</td><td style="padding:6px 12px;font-family:monospace;">${geo.latitude}, ${geo.longitude}</td></tr>
          <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;">ISP</td><td style="padding:6px 12px;">${escapeHtml(geo.isp)}</td></tr>
          <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;">Organization</td><td style="padding:6px 12px;">${escapeHtml(geo.organization)}</td></tr>
          <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;">ASN</td><td style="padding:6px 12px;">${escapeHtml(geo.asn)}</td></tr>
          <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;">Timezone</td><td style="padding:6px 12px;">${escapeHtml(geo.time_zone?.name || 'N/A')}</td></tr>
        </table>
      ` : `
        <div style="padding:16px;background:#f5f5f5;border-radius:8px;text-align:center;color:#666;">
          ${geo ? escapeHtml(geo.message || 'Geolocation data not available for this IP') : 'No geolocation lookup performed'}
          <br><span style="font-family:monospace;color:#0099ff;">IP: ${escapeHtml(email.originatingIP)}</span>
        </div>
      `}
    </div>

    <div style="margin-top:24px;">
      <h2 style="color:#0099ff;border-bottom:2px solid #0099ff;padding-bottom:6px;margin-bottom:12px;">Domain Intelligence</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;width:200px;">Domain</td><td style="padding:6px 12px;font-family:monospace;">${escapeHtml(email.domain)}</td></tr>
        <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;">Domain Age</td><td style="padding:6px 12px;">${escapeHtml(email.domainAge)}</td></tr>
        <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;">Registrar</td><td style="padding:6px 12px;">${escapeHtml(email.domainRegistrar)}</td></tr>
        <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;">Name Servers</td><td style="padding:6px 12px;font-family:monospace;font-size:11px;">${escapeHtml(email.domainNS)}</td></tr>
        <tr><td style="padding:6px 12px;background:#f0f4ff;font-weight:bold;">MX Records</td><td style="padding:6px 12px;font-family:monospace;font-size:11px;">${escapeHtml(email.domainMX)}</td></tr>
      </table>
    </div>

    <div style="margin-top:24px;">
      <h2 style="color:#0099ff;border-bottom:2px solid #0099ff;padding-bottom:6px;margin-bottom:12px;">Relay Path Analysis</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f0f4ff;">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">Hop</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">From</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">By</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">IP</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">Protocol</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">Delay</th>
          </tr>
        </thead>
        <tbody>${relayHopsHTML}</tbody>
      </table>
    </div>

    <div style="margin-top:24px;">
      <h2 style="color:#0099ff;border-bottom:2px solid #0099ff;padding-bottom:6px;margin-bottom:12px;">Raw Received Headers</h2>
      ${receivedHeadersHTML || '<p style="color:#888;">No received headers found</p>'}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>THREATX Forensic Report — ${escapeHtml(email.subject)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #ffffff; color: #1a1a1a; line-height: 1.5; padding: 40px 20px; }
  .report-container { max-width: 800px; margin: 0 auto; }
  .header { text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #0a1628, #0f2640); border-radius: 12px; color: white; margin-bottom: 30px; }
  .header h1 { font-size: 28px; margin-bottom: 8px; letter-spacing: 2px; }
  .header .tagline { font-size: 12px; color: #8090b0; font-family: monospace; }
  .case-info { display: flex; justify-content: center; gap: 30px; margin-top: 15px; font-size: 11px; font-family: monospace; color: #a0b0c0; }
  .section { margin-top: 24px; }
  .section h2 { color: #0099ff; border-bottom: 2px solid #0099ff; padding-bottom: 6px; margin-bottom: 12px; font-size: 18px; }
  .risk-card { display: flex; align-items: center; gap: 24px; padding: 24px; border-radius: 12px; background: #f8f9fa; border: 1px solid #e0e0e0; }
  .risk-score-circle { width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; color: white; flex-shrink: 0; }
  .risk-info h3 { font-size: 20px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .data-table td { padding: 6px 12px; }
  .data-table td:first-child { background: #f0f4ff; font-weight: bold; width: 200px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 11px; color: #888; }
  @media print { body { padding: 0; } .report-container { max-width: 100%; } }
</style>
</head>
<body>
<div class="report-container">
  <div class="header">
    <h1>THREAT<span style="color:#00e5ff;">X</span></h1>
    <div class="tagline">AI-Powered Email Threat Detection — Forensic Analysis Report</div>
    <div class="case-info">
      <span>Case ID: ${escapeHtml(caseId)}</span>
      <span>Generated: ${escapeHtml(generatedAt)}</span>
      <span>Portal: ${escapeHtml(portal.replace('_', ' ').toUpperCase())}</span>
    </div>
  </div>

  <div class="section">
    <h2>Risk Assessment</h2>
    <div class="risk-card">
      <div class="risk-score-circle" style="background:${color};">${result.riskScore}</div>
      <div class="risk-info">
        <h3 style="color:${color};">${escapeHtml(result.threatLevel.toUpperCase())}</h3>
        <p style="color:#666;font-size:13px;margin-top:4px;">Risk Score: ${result.riskScore} / 100 — ${result.isPhishing ? 'This email is likely a phishing attempt' : 'No significant threats detected'}</p>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Email Overview</h2>
    <table class="data-table">
      <tr><td>From</td><td style="font-family:monospace;">${escapeHtml(email.from)}</td></tr>
      <tr><td>Display Name</td><td>${escapeHtml(email.fromName)}</td></tr>
      <tr><td>To</td><td style="font-family:monospace;">${escapeHtml(email.to)}</td></tr>
      <tr><td>Subject</td><td>${escapeHtml(email.subject)}</td></tr>
      <tr><td>Date</td><td>${escapeHtml(email.date)}</td></tr>
      <tr><td>Return-Path</td><td style="font-family:monospace;">${escapeHtml(email.returnPath)}</td></tr>
      <tr><td>Reply-To</td><td style="font-family:monospace;">${escapeHtml(email.replyTo)}</td></tr>
      <tr><td>Message-ID</td><td style="font-family:monospace;font-size:11px;">${escapeHtml(email.messageId)}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Authentication Results</h2>
    <table class="data-table">
      <tr><td>SPF</td><td style="color:${email.spf.startsWith('PASS') ? '#00d97e' : '#ff3355'};font-weight:bold;">${escapeHtml(email.spf)}</td></tr>
      <tr><td>DKIM</td><td style="color:${email.dkim.startsWith('PASS') ? '#00d97e' : '#ff3355'};font-weight:bold;">${escapeHtml(email.dkim)}</td></tr>
      <tr><td>DMARC</td><td style="color:${email.dmarc.startsWith('PASS') ? '#00d97e' : '#ff3355'};font-weight:bold;">${escapeHtml(email.dmarc)}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Threat Indicators</h2>
    <table>
      <thead>
        <tr style="background:#f0f4ff;">
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">Category</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">Indicator</th>
          <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #0099ff;">Status</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">Detail</th>
        </tr>
      </thead>
      <tbody>${indicatorsHTML}</tbody>
    </table>
  </div>

  ${geoSection}

  <div class="section">
    <h2>Link Analysis</h2>
    <table>
      <thead>
        <tr style="background:#f0f4ff;">
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">URL</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">Display Text</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">Verdict</th>
        </tr>
      </thead>
      <tbody>${linksHTML}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Attachment Analysis</h2>
    <table>
      <thead>
        <tr style="background:#f0f4ff;">
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">Filename</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">Type</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">Size</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #0099ff;">Verdict</th>
        </tr>
      </thead>
      <tbody>${attachmentsHTML}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Threat Analysis Summary</h2>
    <ul style="list-style:none;padding:0;">${reasonsHTML}</ul>
  </div>

  <div class="section">
    <h2>Recommendations</h2>
    <ul style="list-style:none;padding:0;">${recommendationsHTML}</ul>
  </div>

  <div class="section">
    <h2>How This Evaluation Works</h2>
    <p style="color:#555;font-size:13px;line-height:1.6;">${escapeHtml(result.evaluation)}</p>
  </div>

  <div class="section">
    <h2>Email Body</h2>
    <pre style="background:#f5f5f5;padding:16px;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-word;font-family:monospace;">${escapeHtml(email.body)}</pre>
  </div>

  <div class="footer">
    <p>THREATX Forensic Report — Generated ${escapeHtml(generatedAt)}</p>
    <p>Case ID: ${escapeHtml(caseId)} — This report was generated by the THREATX email threat detection system.</p>
  </div>
</div>
</body>
</html>`;
}

export function downloadFullReport(data: FullReportData): void {
  const html = generateReportHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');

  if (win) {
    win.onload = () => {
      setTimeout(() => {
        win.print();
      }, 500);
    };
  }

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
