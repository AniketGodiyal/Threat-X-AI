# ThreatX

**ThreatX** is an AI-assisted cybersecurity platform designed to detect, analyze, and investigate suspicious emails and potential phishing threats. It combines traditional rule-based security analysis with machine-learning-based detection to provide users with a more comprehensive assessment of email threats.

## Key Features

### 1. Hybrid Phishing Detection

ThreatX combines a **rule-based detection engine** with a **pre-trained transformer-based phishing detection model**.

The rule-based engine analyzes technical and behavioral indicators such as:

* Suspicious URLs
* Sender information
* Urgency and threat-based language
* Credential requests
* Domain anomalies
* Email headers and technical metadata

The AI model analyzes the **semantic content of the email**, helping identify phishing attempts that may not trigger conventional security rules.

The two detection approaches can be combined to generate an overall threat/risk assessment.

### 2. AI-Based Email Analysis

ThreatX integrates a pre-trained NLP model specifically designed for phishing-email classification.

The model analyzes email content such as:

* Subject
* Email body
* Suspicious phrases
* Social-engineering patterns
* Requests for sensitive information

The system produces an AI-based phishing probability/classification that complements the existing rule-based analysis.

### 3. Trust-Aware Origin Tracing

ThreatX analyzes email routing information and **Received headers** to trace the path taken by an email.

The system can distinguish between:

* Trusted/verified infrastructure
* Unverified relay servers
* Suspicious routing information
* Potentially forged or inconsistent headers

When the original source cannot be reliably established, the system reports the uncertainty rather than presenting an unverified origin as fact.

### 4. Domain & Infrastructure Analysis

ThreatX can analyze domains and network infrastructure associated with suspicious emails.

The analysis can include:

* Domain information
* IP addresses
* DNS information
* RDAP/WHOIS-style registration information
* Domain/IP relationships
* Infrastructure metadata
* Source and timestamp information

This allows investigators to understand the infrastructure behind a suspicious email rather than relying only on its textual content.

### 5. Geolocation Analysis

ThreatX can associate discovered IP addresses with geographical and network information.

The geolocation view can provide information such as:

* Approximate geographic location
* Country/region
* IP address
* Network/ISP information
* Infrastructure location

Geolocation is treated as an **investigative indicator**, not as definitive proof of the attacker's physical location.

### 6. Campaign Correlation

ThreatX can correlate multiple suspicious emails and identify shared infrastructure.

Potential relationships include:

```text
Email A ──┐
          ├── Domain X
Email B ──┤
          ├── IP Y
Email C ──┘
          └── URL Z
```

This helps identify whether seemingly different emails may belong to the same phishing campaign.

Investigators can follow relationships between:

* Emails
* Domains
* IP addresses
* URLs
* Senders
* Infrastructure

### 7. Evidence-Based Investigation

ThreatX is designed to keep the analysis explainable.

Instead of simply returning:

**"PHISHING"**

the system can present supporting evidence such as:

```text
AI Analysis
Phishing Probability: 91%

Rule-Based Indicators
✓ Suspicious URL
✓ Urgent language
✓ Credential request
✓ Untrusted sender

Infrastructure
✓ Suspicious domain
✓ Unverified relay
✓ Related IP infrastructure
```

This allows users to understand **why** an email was considered suspicious.

### 8. Evidence Integrity

ThreatX maintains the relationship between detection results and the evidence used to generate them.

Where possible, findings can include:

* Source information
* Timestamps
* Extracted indicators
* Supporting technical evidence
* Relationships between indicators

This helps investigators verify the reasoning behind an analysis rather than relying on unexplained AI predictions.

## Overall Architecture

```text
                    EMAIL
                      │
          ┌───────────┴───────────┐
          │                       │
     Email Content          Technical Data
          │                       │
          ▼                       ▼
   AI Phishing Model        Rule-Based Engine
          │                       │
          └───────────┬───────────┘
                      │
               Threat Assessment
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    Origin         Domain/IP     Geolocation
    Tracing        Analysis      Analysis
        │             │             │
        └─────────────┼─────────────┘
                      ▼
              Campaign Correlation
                      │
                      ▼
              Evidence & Findings
                      │
                      ▼
                ThreatX Dashboard
```

## Technology Stack

* **Frontend:** React + TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS
* **Backend/Database:** Supabase
* **AI/NLP:** Pre-trained Transformer-based phishing detection model
* **Security Analysis:** Rule-based detection engine
* **Infrastructure Analysis:** DNS/RDAP/IP intelligence
* **Visualization:** Interactive cybersecurity dashboard

## Objective

The objective of ThreatX is to provide a **unified email-threat investigation platform** that combines AI, rule-based detection, infrastructure intelligence, geolocation, and campaign correlation.

Rather than depending entirely on either machine learning or manually defined security rules, ThreatX combines multiple sources of evidence to produce a more explainable and investigation-oriented threat assessment.
