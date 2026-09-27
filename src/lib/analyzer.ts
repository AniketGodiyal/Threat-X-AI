import type { EmailData } from './sampleEmails';

export interface ThreatIndicator {
  category: string;
  label: string;
  status: 'pass' | 'fail' | 'warn';
  detail: string;
}

export interface MLPrediction {
  label: string;
  score: number;
  phishingProbability: number;
  modelUsed: string;
  modelSource: string;
}

export interface AnalysisResult {
  riskScore: number;
  threatLevel: 'safe' | 'suspicious' | 'malicious';
  isPhishing: boolean;
  indicators: ThreatIndicator[];
  reasons: string[];
  recommendations: string[];
  evaluation: string;
  categoryScores: Record<string, number>;
  mlPrediction?: MLPrediction;
  combinedScore: number;
}

export function analyzeEmail(email: EmailData): AnalysisResult {
  return analyzeEmailWithML(email, null);
}

export function combineScore(ruleScore: number, mlProbability: number): number {
  // Weight: 45% ML model, 55% rule-based (rules catch auth/header issues ML can't see)
  const mlScore = mlProbability * 100;
  return Math.round(ruleScore * 0.55 + mlScore * 0.45);
}

export function analyzeEmailWithML(email: EmailData, mlPrediction: MLPrediction | null): AnalysisResult {
  const indicators: ThreatIndicator[] = [];
  const reasons: string[] = [];
  const recommendations: string[] = [];
  const categoryScores: Record<string, number> = {};
  let score = 0;

  const addScore = (category: string, points: number) => {
    categoryScores[category] = (categoryScores[category] || 0) + points;
    score += points;
  };

  const addIndicator = (
    category: string,
    label: string,
    status: ThreatIndicator['status'],
    detail: string,
    points: number
  ) => {
    indicators.push({ category, label, status, detail });
    if (status === 'fail') {
      addScore(category, points);
      reasons.push(detail);
    }
  };

  const spfFail = !email.spf.startsWith('PASS');
  const dkimFail = !email.dkim.startsWith('PASS');
  const dmarcFail = !email.dmarc.startsWith('PASS');

  addIndicator(
    'Authentication',
    'SPF Validation',
    spfFail ? 'fail' : 'pass',
    email.spf,
    20
  );
  addIndicator(
    'Authentication',
    'DKIM Signature',
    dkimFail ? 'fail' : 'pass',
    email.dkim,
    20
  );
  addIndicator(
    'Authentication',
    'DMARC Policy',
    dmarcFail ? 'fail' : 'pass',
    email.dmarc,
    15
  );

  const domainAgeMatch = email.domainAge.match(/(\d+)\s*days?/i);
  const domainAgeDays = domainAgeMatch ? parseInt(domainAgeMatch[1]) : 365;
  const domainAgeFail = domainAgeDays < 30;
  addIndicator(
    'Domain Intelligence',
    'Domain Age',
    domainAgeFail ? 'fail' : 'pass',
    email.domainAge,
    15
  );

  const suspiciousRegistrar = email.domainRegistrar.toLowerCase().includes('njalla') ||
    email.domainRegistrar.toLowerCase().includes('privacy') ||
    email.domainRegistrar.toLowerCase().includes('not available');
  addIndicator(
    'Domain Intelligence',
    'Domain Registrar',
    suspiciousRegistrar ? 'fail' : 'pass',
    email.domainRegistrar,
    10
  );

  const fromDomain = email.from.split('@')[1] || '';
  const fromDomainRoot = fromDomain.split('.')[0].toLowerCase();
  const fromNameLower = email.fromName.toLowerCase();
  const domainMismatch = fromDomainRoot && !fromNameLower.includes(fromDomainRoot) &&
    !fromDomainRoot.includes(fromNameLower) && fromNameLower.length > 0;
  addIndicator(
    'Sender Identity',
    'Display Name vs Domain',
    domainMismatch ? 'fail' : 'pass',
    domainMismatch
      ? `Display name "${email.fromName}" does not match sender domain "${fromDomain}"`
      : 'Display name is consistent with sender domain',
    10
  );

  const urgencyWords = ['urgent', 'immediate', 'suspended', 'verify', 'action required', 'failure', 'permanent', 'deadline', 'expire', 'warning', 'alert', 'confirm'];
  const subjectLower = email.subject.toLowerCase();
  const bodyLower = email.body.toLowerCase();
  const hasUrgency = urgencyWords.some((w) => subjectLower.includes(w) || bodyLower.includes(w));
  addIndicator(
    'Content Analysis',
    'Urgency / Pressure Language',
    hasUrgency ? 'fail' : 'pass',
    hasUrgency
      ? 'Email uses urgency cues ("urgent", "suspended", "immediate action") to pressure the recipient'
      : 'No urgency or pressure language detected',
    10
  );

  const suspiciousLinks = email.links.filter((l) => l.suspicious);
  addIndicator(
    'Link Analysis',
    'Suspicious Links',
    suspiciousLinks.length > 0 ? 'fail' : 'pass',
    suspiciousLinks.length > 0
      ? `${suspiciousLinks.length} suspicious link(s) detected: ${suspiciousLinks.map((l) => l.url).join(', ')}`
      : 'No suspicious links detected',
    15
  );

  const suspiciousAttachments = email.attachments.filter((a) => a.suspicious);
  addIndicator(
    'Attachment Analysis',
    'Suspicious Attachments',
    suspiciousAttachments.length > 0 ? 'fail' : 'pass',
    suspiciousAttachments.length > 0
      ? `${suspiciousAttachments.length} suspicious attachment(s): ${suspiciousAttachments.map((a) => a.name).join(', ')}`
      : 'No suspicious attachments detected',
    10
  );

  const relayAnomaly = email.receivedHeaders.some((h) => h.includes('localhost') || h.includes('HTTP'));
  addIndicator(
    'Header Forensics',
    'Relay Path Integrity',
    relayAnomaly ? 'fail' : 'pass',
    relayAnomaly
      ? 'Anomalous relay path detected (localhost origin or HTTP transport in headers)'
      : 'Relay path is consistent with standard SMTP routing',
    10
  );

  const replyToMismatch = email.replyTo !== email.from && email.replyTo !== 'Unknown';
  addIndicator(
    'Header Forensics',
    'Reply-To vs From',
    replyToMismatch ? 'warn' : 'pass',
    replyToMismatch
      ? `Reply-To (${email.replyTo}) differs from From (${email.from})`
      : 'Reply-To matches From address',
    5
  );

  score = Math.min(score, 100);
  const ruleScore = score;
  const mlProb = mlPrediction ? mlPrediction.phishingProbability : 0;
  const combinedScore = mlPrediction ? combineScore(ruleScore, mlProb) : ruleScore;
  const finalScore = combinedScore;
  const isPhishing = finalScore >= 31;

  if (mlPrediction) {
    const mlPct = Math.round(mlProb * 100);
    if (mlProb > 0.5) {
      reasons.unshift(`ML Model (${mlPrediction.modelUsed}): ${mlPct}% phishing probability — the AI model classifies this email as ${mlPrediction.label}.`);
    } else {
      reasons.unshift(`ML Model (${mlPrediction.modelUsed}): ${100 - mlPct}% safe probability — the AI model classifies this email as ${mlPrediction.label}.`);
    }
  }

  if (isPhishing) {
    if (spfFail || dkimFail || dmarcFail) {
      reasons.push('Multiple authentication failures (SPF, DKIM, DMARC) indicate the sender is not authorized to send on behalf of the claimed domain.');
    }
    if (domainAgeFail) {
      reasons.push('The sender domain was registered very recently, a common pattern in phishing campaigns.');
    }
    if (hasUrgency) {
      reasons.push('The email uses urgency and fear tactics to manipulate the recipient into clicking without thinking.');
    }
    if (suspiciousLinks.length > 0) {
      reasons.push('Suspicious links redirect to a fraudulent website designed to harvest credentials.');
    }
    recommendations.push('Do NOT click any links in this email.');
    recommendations.push('Do NOT download or open any attachments.');
    recommendations.push('Report this email to your IT security team or forward it to your organization\'s phishing report address.');
    recommendations.push('Delete the email from your inbox and empty your trash.');
    recommendations.push('If you already clicked a link or entered credentials, change your password immediately and contact your bank.');
  } else {
    recommendations.push('This email appears safe based on authentication and content analysis.');
    recommendations.push('Always remain cautious and verify unexpected requests through a separate communication channel.');
    recommendations.push('No immediate action is required.');
  }

  const evaluation = `The THREATX risk score is calculated by evaluating ${indicators.length} forensic indicators across ${new Set(indicators.map((i) => i.category)).size} categories: Authentication (SPF, DKIM, DMARC), Domain Intelligence (domain age, registrar reputation), Sender Identity (display name vs domain alignment), Content Analysis (urgency cues, social engineering patterns), Link Analysis (suspicious URLs, obfuscation), Attachment Analysis (file type risk), and Header Forensics (relay path integrity, reply-to mismatch). Each indicator contributes weighted points to the final score (0-100).${mlPrediction ? ` The score also incorporates a DistilBERT ML model (${mlPrediction.modelUsed}) that analyzes the email text for phishing patterns with ${Math.round(mlPrediction.score * 100)}% confidence. The final combined score weights the ML model at 45% and the rule-based system at 55%, since rules can detect authentication and header anomalies that text analysis cannot.` : ''} A score of 0-30 is considered SAFE, 31-70 is SUSPICIOUS, and 71-100 is MALICIOUS.`;

  return {
    riskScore: finalScore,
    threatLevel: finalScore >= 71 ? 'malicious' : finalScore >= 31 ? 'suspicious' : 'safe',
    isPhishing,
    indicators,
    reasons,
    recommendations,
    evaluation,
    categoryScores,
    mlPrediction: mlPrediction || undefined,
    combinedScore: finalScore,
  };
}
