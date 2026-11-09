export interface RelayHop {
  hop: number;
  from: string;
  by: string;
  protocol: string;
  ip: string;
  timestamp: string;
  withParam: string;
  delay: string;
}

export interface EmailData {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  date: string;
  returnPath: string;
  replyTo: string;
  messageId: string;
  receivedHeaders: string[];
  relayHops: RelayHop[];
  dkim: string;
  spf: string;
  dmarc: string;
  body: string;
  originatingIP: string;
  geoIP: string;
  geoCity: string;
  geoRegion: string;
  geoCountry: string;
  geoLat: number;
  geoLon: number;
  geoISP: string;
  geoOrg: string;
  geoTimezone: string;
  geoASN: string;
  domain: string;
  domainAge: string;
  domainRegistrar: string;
  domainNS: string;
  domainMX: string;
  links: { url: string; text: string; suspicious: boolean; redirect: boolean }[];
  attachments: { name: string; type: string; suspicious: boolean; size: string }[];
}

export interface SampleEmail extends EmailData {
  id: string;
  label: string;
  description: string;
  isMalicious: boolean;
  riskScore: number;
}

export const sampleEmails: SampleEmail[] = [
  {
    id: 'malicious-1',
    label: 'Urgent: Account Suspended',
    description: 'A phishing email impersonating HSBC Bank, urging the recipient to click a link to verify their account.',
    isMalicious: true,
    riskScore: 92,
    from: 'noreply@secure-bank-verify.com',
    fromName: 'HSBC Security Team',
    to: 'victim@example.com',
    subject: 'URGENT: Your Account Has Been Suspended - Immediate Action Required',
    date: '2026-09-09T14:23:11Z',
    returnPath: 'bounce@secure-bank-verify.com',
    replyTo: 'noreply@secure-bank-verify.com',
    messageId: '<a8f3c2d1@mailserver.secure-bank-verify.com>',
    receivedHeaders: [
      'from mail.secure-bank-verify.com (mail.secure-bank-verify.com [45.133.1.104]) by mx.google.com with ESMTP id abc123 for <victim@example.com>; Tue, 09 Sep 2026 14:23:12 +0000',
      'from localhost (127.0.0.1) by mail.secure-bank-verify.com with ESMTPSA id xyz789; Tue, 09 Sep 2026 14:23:10 +0000',
      'from [45.133.1.104] by relay.suspicious.net with HTTP; Tue, 09 Sep 2026 14:23:08 +0000',
    ],
    relayHops: [
      {
        hop: 3,
        from: '[45.133.1.104]',
        by: 'relay.suspicious.net',
        protocol: 'HTTP',
        ip: '45.133.1.104',
        timestamp: 'Tue, 09 Sep 2026 14:23:08 +0000',
        withParam: 'HTTP (unencrypted, non-standard)',
        delay: 'Origin',
      },
      {
        hop: 2,
        from: 'localhost (127.0.0.1)',
        by: 'mail.secure-bank-verify.com',
        protocol: 'ESMTPSA',
        ip: '127.0.0.1',
        timestamp: 'Tue, 09 Sep 2026 14:23:10 +0000',
        withParam: 'ESMTPSA (TLS but localhost origin — spoofed)',
        delay: '+2s',
      },
      {
        hop: 1,
        from: 'mail.secure-bank-verify.com [45.133.1.104]',
        by: 'mx.google.com',
        protocol: 'ESMTP',
        ip: '45.133.1.104',
        timestamp: 'Tue, 09 Sep 2026 14:23:12 +0000',
        withParam: 'ESMTP id abc123',
        delay: '+2s',
      },
    ],
    dkim: 'FAIL — signature domain (secure-bank-verify.com) does not match sender domain',
    spf: 'FAIL — IP 45.133.1.104 is not authorized to send for secure-bank-verify.com',
    dmarc: 'FAIL — neither SPF nor DKIM aligned; policy rejected',
    body: `Dear Valued Customer,

Your HSBC bank account has been temporarily suspended due to suspicious activity detected on 09/09/2026.

To restore access to your account, you must verify your identity immediately by clicking the link below:

>> CLICK HERE TO VERIFY YOUR ACCOUNT <<

Failure to verify within 24 hours will result in permanent account closure and loss of all funds.

This is a security measure to protect your account from unauthorized access.

HSBC Security Department
© 2026 HSBC Holdings plc`,
    originatingIP: '45.133.1.104',
    geoIP: '45.133.1.104',
    geoCity: 'St. Petersburg',
    geoRegion: 'St. Petersburg City',
    geoCountry: 'Russia',
    geoLat: 59.9311,
    geoLon: 30.3609,
    geoISP: 'Selectel Network',
    geoOrg: 'Selectel LLC / Hosting Provider',
    geoTimezone: 'Europe/Moscow (UTC+3)',
    geoASN: 'AS49505 — Selectel LLC',
    domain: 'secure-bank-verify.com',
    domainAge: 'Registered 3 days ago (2026-09-06)',
    domainRegistrar: 'Njalla AB (privacy-anonymous registrar)',
    domainNS: 'ns1.suspended-domain.io, ns2.suspended-domain.io',
    domainMX: 'No MX records found (non-standard for email domain)',
    links: [
      { url: 'http://secure-bank-verify.com/login.php?token=abc123', text: 'CLICK HERE TO VERIFY YOUR ACCOUNT', suspicious: true, redirect: true },
      { url: 'http://secure-bank-verify.com/unsubscribe', text: 'Unsubscribe', suspicious: true, redirect: false },
    ],
    attachments: [
      { name: 'Account_Verification_Form.html', type: 'text/html', suspicious: true, size: '4.2 KB' },
    ],
  },
  {
    id: 'safe-1',
    label: 'Meeting Reminder from Colleague',
    description: 'A legitimate internal meeting reminder from a known colleague using the company email system.',
    isMalicious: false,
    riskScore: 8,
    from: 'sarah.johnson@company.com',
    fromName: 'Sarah Johnson',
    to: 'team@company.com',
    subject: 'Reminder: Project Review Meeting Tomorrow at 2 PM',
    date: '2026-09-09T09:15:00Z',
    returnPath: 'sarah.johnson@company.com',
    replyTo: 'sarah.johnson@company.com',
    messageId: '<CABc1234567890@mail.company.com>',
    receivedHeaders: [
      'from mail.company.com (mail.company.com [203.0.113.45]) by mx.google.com with ESMTPSA id def456 (version=TLS1_3 cipher=TLS_AES_256_GCM_SHA384) for <team@company.com>; Tue, 09 Sep 2026 09:15:01 +0000',
      'from [192.168.1.42] (unknown [203.0.113.45]) by mail.company.com (Postfix) with ESMTPSA id ghi789 for <team@company.com>; Tue, 09 Sep 2026 09:15:00 +0000',
    ],
    relayHops: [
      {
        hop: 2,
        from: '[192.168.1.42] (unknown [203.0.113.45])',
        by: 'mail.company.com (Postfix)',
        protocol: 'ESMTPSA',
        ip: '203.0.113.45',
        timestamp: 'Tue, 09 Sep 2026 09:15:00 +0000',
        withParam: 'ESMTPSA TLS1_3 cipher=TLS_AES_256_GCM_SHA384',
        delay: 'Origin',
      },
      {
        hop: 1,
        from: 'mail.company.com [203.0.113.45]',
        by: 'mx.google.com',
        protocol: 'ESMTPSA',
        ip: '203.0.113.45',
        timestamp: 'Tue, 09 Sep 2026 09:15:01 +0000',
        withParam: 'ESMTPSA id def456 (version=TLS1_3)',
        delay: '+1s',
      },
    ],
    dkim: 'PASS — signature verified, domain aligned (company.com)',
    spf: 'PASS — IP 203.0.113.45 is authorized to send for company.com',
    dmarc: 'PASS — SPF aligned, DKIM aligned, policy satisfied (p=reject)',
    body: `Hi team,

Just a reminder that we have our Project Review meeting tomorrow at 2 PM in Conference Room B.

Agenda:
- Q3 progress review
- Budget discussion
- Timeline for Q4 deliverables

Please bring your updated status reports. If you can't attend in person, you can join via the video call link I shared in the calendar invite.

Thanks,
Sarah Johnson
Project Manager
Company Corp`,
    originatingIP: '203.0.113.45',
    geoIP: '203.0.113.45',
    geoCity: 'San Francisco',
    geoRegion: 'California',
    geoCountry: 'United States',
    geoLat: 37.7749,
    geoLon: -122.4194,
    geoISP: 'Cloudflare Inc.',
    geoOrg: 'Company Corp (corporate hosting)',
    geoTimezone: 'America/Los_Angeles (UTC-7)',
    geoASN: 'AS13335 — Cloudflare, Inc.',
    domain: 'company.com',
    domainAge: 'Registered 12 years ago (2014-03-15)',
    domainRegistrar: 'GoDaddy.com LLC',
    domainNS: 'ns1.company.com, ns2.company.com',
    domainMX: 'mail.company.com (10), fallback.company.com (20)',
    links: [],
    attachments: [],
  },
];
