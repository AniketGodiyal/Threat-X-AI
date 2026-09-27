import { useState, useRef } from 'react';
import {
  Upload, FileText, ArrowLeft, Shield, ShieldAlert, ShieldCheck,
  AlertTriangle, CheckCircle2, XCircle, Gauge, Globe, ArrowRight,
  MapPin, Link2, FileSearch, GitBranch, Fingerprint, Building2,
  Clock, Download, Activity,
} from 'lucide-react';
import { sampleEmails, type SampleEmail, type EmailData, type RelayHop } from '@/lib/sampleEmails';
import { analyzeEmailWithML, type AnalysisResult, type MLPrediction } from '@/lib/analyzer';
import { fetchMLPrediction } from '@/lib/mlService';
import { parseEml } from '@/lib/emlParser';
import { fetchGeoData, type GeoData } from '@/lib/geoService';
import { downloadFullReport } from '@/lib/reportGenerator';
import { supabase } from '@/lib/supabase';
import { ScanAnimation } from './ScanAnimation';
import { ResultsNav, ResultsPagination, type TabConfig } from './ResultsNav';
import { BarChart, DonutChart, IndicatorTable, RelayTable, DataTable } from './Charts';

type LEStep = 'upload' | 'scanning' | 'results';
type LETab = 'risk' | 'geo' | 'headers' | 'path' | 'domain' | 'links' | 'indicators' | 'summary';

const WORLD_MAP_URL = 'https://images.pexels.com/photos/41949/earth-earth-at-night-night-lights-41949.jpeg?auto=compress&cs=tinysrgb&w=1260&h=630';

export function LawEnforcementPortal({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<LEStep>('upload');
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<LETab>('risk');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [mlPrediction, setMlPrediction] = useState<MLPrediction | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [caseId] = useState(`THREATX-${Date.now().toString().slice(-8)}`);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.eml')) {
      setError('Please upload a .eml file');
      return;
    }
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseEml(text);
      setSelectedEmail(parsed);
      setStep('scanning');
    } catch {
      setError('Failed to parse the .eml file. Please ensure it is a valid email file.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleEmailSelect = (email: SampleEmail) => {
    setSelectedEmail(email);
    setStep('scanning');
  };

  const handleScanComplete = async () => {
    if (!selectedEmail) return;

    setMlLoading(true);
    setStep('results');
    setActiveTab('risk');

    let mlPred: MLPrediction | null = null;
    try {
      mlPred = await fetchMLPrediction(selectedEmail.body, selectedEmail.subject, selectedEmail.from);
    } catch {
      mlPred = null;
    }
    setMlPrediction(mlPred);
    setMlLoading(false);

    const analysisResult = analyzeEmailWithML(selectedEmail, mlPred);
    setResult(analysisResult);

    const alreadyHasGeo = selectedEmail.geoLat !== 0 && selectedEmail.geoLon !== 0;
    if (alreadyHasGeo) {
      setGeoData(null);
      return;
    }

    setGeoLoading(true);
    const geo = await fetchGeoData(selectedEmail.originatingIP);
    setGeoData(geo);
    setGeoLoading(false);

    if (geo && geo.latitude !== 0 && geo.city !== 'Not available' && geo.city !== 'Private/Local Network') {
      setSelectedEmail(prev => prev ? {
        ...prev,
        geoIP: geo.ip,
        geoCity: geo.city,
        geoRegion: geo.state_prov,
        geoCountry: geo.country_name,
        geoLat: geo.latitude,
        geoLon: geo.longitude,
        geoISP: geo.isp,
        geoOrg: geo.organization,
        geoASN: geo.asn,
        geoTimezone: geo.time_zone?.name || 'N/A',
      } : prev);
    }

    try {
      await supabase.from('scan_reports').insert({
        email_from: selectedEmail.from,
        email_to: selectedEmail.to,
        email_subject: selectedEmail.subject,
        email_date: selectedEmail.date,
        originating_ip: selectedEmail.originatingIP,
        risk_score: analysisResult.riskScore,
        threat_level: analysisResult.threatLevel,
        is_phishing: analysisResult.isPhishing,
        portal: 'law_enforcement',
        analysis_json: analysisResult as unknown as Record<string, unknown>,
        email_data_json: selectedEmail as unknown as Record<string, unknown>,
        geo_data_json: geo as unknown as Record<string, unknown> | null,
      });
    } catch {
      // non-blocking — scan still works without DB persistence
    }
  };

  const handleReset = () => {
    setStep('upload');
    setSelectedEmail(null);
    setResult(null);
    setError(null);
    setGeoData(null);
    setGeoLoading(false);
    setMlPrediction(null);
    setMlLoading(false);
    setActiveTab('risk');
  };

  const handleDownloadReport = () => {
    if (!selectedEmail || !result) return;
    downloadFullReport({
      email: selectedEmail,
      result,
      geo: geoData,
      portal: 'law_enforcement',
      caseId,
      generatedAt: new Date().toISOString(),
    });
  };

  if (step === 'scanning') return <ScanAnimation onComplete={handleScanComplete} duration={12} />;

  const tabs: (TabConfig & { id: LETab })[] = [
    { id: 'risk', label: 'Risk Assessment', icon: <Gauge className="w-4 h-4" /> },
    { id: 'geo', label: 'Geolocation', icon: <Globe className="w-4 h-4" /> },
    { id: 'headers', label: 'Raw Headers', icon: <FileSearch className="w-4 h-4" /> },
    { id: 'path', label: 'Path Graph', icon: <GitBranch className="w-4 h-4" /> },
    { id: 'domain', label: 'Domain Intel', icon: <Building2 className="w-4 h-4" /> },
    { id: 'links', label: 'Links & Files', icon: <Link2 className="w-4 h-4" /> },
    { id: 'indicators', label: 'All Indicators', icon: <Activity className="w-4 h-4" /> },
    { id: 'summary', label: 'Full Summary', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-cyber-text-dim hover:text-cyber-cyan text-sm font-mono transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Portal Selection
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyber-cyan" strokeWidth={1.5} />
            <span className="text-cyber-cyan text-sm font-mono font-semibold">LAW ENFORCEMENT PORTAL</span>
          </div>
        </div>

        {step === 'upload' && (
          <div className="animate-fade-in-up">
            <h1 className="text-3xl font-bold text-cyber-white mb-2">Forensic Intelligence Scanner</h1>
            <p className="text-cyber-text-dim text-sm font-mono mb-8">
              Full forensic analysis with geolocation, header tracing, and path graph visualization
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".eml,.msg,text/plain,message/rfc822"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`glass-card-blue rounded-2xl p-8 mb-4 border-2 border-dashed cursor-pointer transition-all-smooth ${isDragging ? 'border-cyber-cyan bg-cyber-cyan/5' : 'border-cyber-border hover:border-cyber-cyan/40'}`}
            >
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/20 mb-4">
                  <Upload className="w-8 h-8 text-cyber-cyan" strokeWidth={1.5} />
                </div>
                <p className="text-cyber-white font-semibold mb-1">Drop .eml files for forensic analysis or click to browse</p>
                <p className="text-cyber-text-muted text-xs font-mono">or select a sample email below</p>
              </div>
            </div>
            {error && <p className="text-cyber-error text-xs font-mono mb-4 text-center">{error}</p>}
            <div>
              <p className="text-cyber-text-dim text-xs font-mono uppercase tracking-wider mb-4">Select a sample email for forensic analysis</p>
              <div className="grid md:grid-cols-2 gap-4">
                {sampleEmails.map((email) => (
                  <button key={email.id} onClick={() => handleEmailSelect(email)}
                    className="glass-card-blue rounded-xl p-5 text-left transition-all-smooth hover:border-cyber-cyan/50 hover:bg-cyber-cyan/5 group animate-fade-in-up">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${email.isMalicious ? 'bg-cyber-red/10 border border-cyber-red/30' : 'bg-cyber-green/10 border border-cyber-green/30'}`}>
                        {email.isMalicious ? <ShieldAlert className="w-5 h-5 text-cyber-red" strokeWidth={1.5} /> : <ShieldCheck className="w-5 h-5 text-cyber-green" strokeWidth={1.5} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-cyber-white font-semibold text-sm truncate">{email.label}</p>
                        <p className="text-cyber-text-muted text-xs font-mono truncate">{email.from}</p>
                      </div>
                    </div>
                    <p className="text-cyber-text-dim text-xs mb-3">{email.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${email.isMalicious ? 'bg-cyber-red/10 text-cyber-red' : 'bg-cyber-green/10 text-cyber-green'}`}>
                        {email.isMalicious ? 'HIGH THREAT' : 'SAFE'}
                      </span>
                      <span className="text-cyber-cyan text-xs font-mono flex items-center gap-1 group-hover:gap-2 transition-all">Analyze <ArrowRight className="w-3 h-3" /></span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'results' && result && selectedEmail && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <h1 className="text-3xl font-bold text-cyber-white">Forensic Analysis Report</h1>
              <button onClick={handleDownloadReport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue text-sm font-mono hover:bg-cyber-blue/20 transition-colors">
                <Download className="w-4 h-4" /> Full PDF Report
              </button>
            </div>

            <div className="glass-card rounded-xl p-4 flex items-center gap-4 flex-wrap text-xs font-mono mb-6">
              <div className="flex items-center gap-2 text-cyber-text-dim"><FileText className="w-4 h-4 text-cyber-cyan" /> Case ID: {caseId}</div>
              <div className="text-cyber-text-muted">|</div>
              <div className="flex items-center gap-2 text-cyber-text-dim"><Clock className="w-4 h-4 text-cyber-text-muted" />{new Date().toISOString()}</div>
              <div className="text-cyber-text-muted">|</div>
              <div className="flex items-center gap-2 text-cyber-text-dim"><Activity className="w-4 h-4 text-cyber-cyan" />Classification: {result.threatLevel.toUpperCase()}</div>
            </div>

            <ResultsNav tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as LETab)} />

            <div key={activeTab} className="animate-fade-in min-h-[400px]">
              {activeTab === 'risk' && <RiskTab result={result} email={selectedEmail} mlPrediction={mlPrediction} mlLoading={mlLoading} />}
              {activeTab === 'geo' && <GeoTab email={selectedEmail} geoLoading={geoLoading} geoData={geoData} />}
              {activeTab === 'headers' && <HeadersTab email={selectedEmail} />}
              {activeTab === 'path' && <PathTab email={selectedEmail} />}
              {activeTab === 'domain' && <DomainTab email={selectedEmail} />}
              {activeTab === 'links' && <LinksTab email={selectedEmail} />}
              {activeTab === 'indicators' && <IndicatorsTab result={result} />}
              {activeTab === 'summary' && <SummaryTab email={selectedEmail} result={result} />}
            </div>

            <ResultsPagination tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as LETab)} />

            <button onClick={handleReset} className="w-full bg-cyber-blue hover:bg-cyber-blue-bright text-white font-semibold py-3.5 rounded-xl transition-all-smooth flex items-center justify-center gap-2 mt-6">
              Analyze Another Email <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RiskTab({ result, email, mlPrediction, mlLoading }: { result: AnalysisResult; email: EmailData; mlPrediction: MLPrediction | null; mlLoading: boolean }) {
  const passCount = result.indicators.filter(i => i.status === 'pass').length;
  const failCount = result.indicators.filter(i => i.status === 'fail').length;
  const warnCount = result.indicators.filter(i => i.status === 'warn').length;
  const authScore = result.categoryScores['Authentication'] || 0;
  const domainScore = result.categoryScores['Domain Intelligence'] || 0;
  const senderScore = result.categoryScores['Sender Identity'] || 0;
  const contentScore = result.categoryScores['Content Analysis'] || 0;
  const linkScore = result.categoryScores['Link Analysis'] || 0;
  const attachScore = result.categoryScores['Attachment Analysis'] || 0;
  const headerScore = result.categoryScores['Header Forensics'] || 0;

  return (
    <div className="space-y-6">
      <div className="glass-card-blue rounded-2xl p-8 border-glow-blue">
        <div className="flex items-center gap-4 mb-6">
          <Gauge className="w-6 h-6 text-cyber-cyan" strokeWidth={1.5} />
          <h2 className="text-lg font-bold text-cyber-white">Threat Risk Assessment</h2>
          <span className="text-cyber-text-muted text-xs font-mono ml-auto">ML + Rule-Based</span>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="85" fill="none" stroke="#1e2d4a" strokeWidth="12" />
              <circle cx="100" cy="100" r="85" fill="none"
                stroke={result.riskScore >= 71 ? '#ff3355' : result.riskScore >= 31 ? '#ffaa00' : '#00d97e'}
                strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(result.riskScore / 100) * 534} 534`}
                style={{ filter: `drop-shadow(0 0 8px ${result.riskScore >= 71 ? '#ff3355' : result.riskScore >= 31 ? '#ffaa00' : '#00d97e'})` }}
                className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-bold ${result.riskScore >= 71 ? 'text-cyber-red' : result.riskScore >= 31 ? 'text-cyber-warning' : 'text-cyber-green'}`}>{result.riskScore}</span>
              <span className="text-cyber-text-muted text-xs font-mono">/ 100</span>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className={`flex items-center gap-3 p-4 rounded-xl ${result.threatLevel === 'malicious' ? 'bg-cyber-red/10 border border-cyber-red/30' : result.threatLevel === 'suspicious' ? 'bg-cyber-warning/10 border border-cyber-warning/30' : 'bg-cyber-green/10 border border-cyber-green/30'}`}>
              {result.threatLevel === 'malicious' ? <ShieldAlert className="w-6 h-6 text-cyber-red" /> : result.threatLevel === 'suspicious' ? <AlertTriangle className="w-6 h-6 text-cyber-warning" /> : <ShieldCheck className="w-6 h-6 text-cyber-green" />}
              <div>
                <p className="text-cyber-white font-bold uppercase tracking-wide">{result.threatLevel}</p>
                <p className="text-cyber-text-dim text-xs font-mono">{result.isPhishing ? 'Confirmed phishing attempt — high confidence' : 'No significant threats detected'}</p>
              </div>
            </div>
            {mlLoading ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-cyber-bg/50 border border-cyber-cyan/20">
                <div className="w-5 h-5 rounded-full border-2 border-cyber-cyan border-t-transparent animate-spin" />
                <p className="text-cyber-text-dim text-xs font-mono">AI model analyzing email content...</p>
              </div>
            ) : mlPrediction ? (
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${mlPrediction.phishingProbability > 0.5 ? 'bg-cyber-red/5 border-cyber-red/20' : 'bg-cyber-green/5 border-cyber-green/20'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mlPrediction.phishingProbability > 0.5 ? 'bg-cyber-red/10' : 'bg-cyber-green/10'}`}>
                  <span className="text-xs font-mono font-bold">AI</span>
                </div>
                <div className="flex-1">
                  <p className="text-cyber-white text-xs font-mono font-bold">DistilBERT ML Prediction</p>
                  <p className="text-cyber-text-dim text-xs font-mono">
                    {Math.round(mlPrediction.phishingProbability * 100)}% phishing &middot; {Math.round((1 - mlPrediction.phishingProbability) * 100)}% safe
                  </p>
                </div>
                <span className={`text-xs font-mono font-bold ${mlPrediction.phishingProbability > 0.5 ? 'text-cyber-red' : 'text-cyber-green'}`}>
                  {mlPrediction.label.toUpperCase()}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-cyber-white font-bold text-sm font-mono mb-4">Indicator Breakdown</h3>
        <DonutChart
          segments={[
            { value: passCount, color: '#00d97e', label: 'Passed' },
            { value: failCount, color: '#ff3355', label: 'Failed' },
            { value: warnCount, color: '#ffaa00', label: 'Warnings' },
          ]}
          centerLabel="Indicators"
          centerValue={`${result.indicators.length}`}
        />
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-cyber-white font-bold text-sm font-mono mb-4">Risk Score Distribution by Category</h3>
        <BarChart data={[
          { label: 'Authentication (SPF/DKIM/DMARC)', value: authScore, max: 55, color: authScore > 0 ? '#ff3355' : '#00d97e' },
          { label: 'Domain Intelligence', value: domainScore, max: 25, color: domainScore > 0 ? '#ff3355' : '#00d97e' },
          { label: 'Sender Identity', value: senderScore, max: 10, color: senderScore > 0 ? '#ff3355' : '#00d97e' },
          { label: 'Content / NLP Analysis', value: contentScore, max: 10, color: contentScore > 0 ? '#ff3355' : '#00d97e' },
          { label: 'Link Analysis', value: linkScore, max: 15, color: linkScore > 0 ? '#ff3355' : '#00d97e' },
          { label: 'Attachment Analysis', value: attachScore, max: 10, color: attachScore > 0 ? '#ff3355' : '#00d97e' },
          { label: 'Header Forensics', value: headerScore, max: 10, color: headerScore > 0 ? '#ff3355' : '#00d97e' },
        ]} />
      </div>
    </div>
  );
}

function GeoTab({ email, geoLoading, geoData }: { email: EmailData; geoLoading: boolean; geoData: GeoData | null }) {
  const hasGeo = email.geoLat !== 0 || email.geoLon !== 0;
  const x = ((email.geoLon + 180) / 360) * 100;
  const y = ((90 - email.geoLat) / 180) * 100;
  const geoMessage = geoData?.message;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-cyber-cyan" />
          <h2 className="text-lg font-bold text-cyber-white">Geolocation & Origin Tracing</h2>
        </div>
        {geoLoading ? (
          <div className="p-8 rounded-xl bg-cyber-bg/50 border border-cyber-border text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 mb-4 relative">
              <Globe className="w-6 h-6 text-cyber-cyan animate-spin-slow" strokeWidth={1.5} />
            </div>
            <p className="text-cyber-white text-sm font-mono mb-1">Looking up IP geolocation...</p>
            <p className="text-cyber-text-muted text-xs font-mono">Querying external IP intelligence service for {email.originatingIP}</p>
          </div>
        ) : hasGeo ? (
          <div className="relative rounded-xl overflow-hidden border border-cyber-border min-h-[320px]">
            <img src={WORLD_MAP_URL} alt="World Map" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-cyber-navy/40" />
            <svg viewBox="0 0 100 50" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <circle cx={x} cy={y / 2} r="1.2" fill={result_isPhishing(email) ? '#ff3355' : '#00d97e'}>
                <animate attributeName="r" values="1.2;2.5;1.2" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={x} cy={y / 2} r="2.5" fill="none" stroke={result_isPhishing(email) ? '#ff3355' : '#00d97e'} strokeWidth="0.3" opacity="0.6">
                <animate attributeName="r" values="2.5;5;2.5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={x} cy={y / 2} r="5" fill="none" stroke={result_isPhishing(email) ? '#ff3355' : '#00d97e'} strokeWidth="0.2" opacity="0.3">
                <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
              </circle>
            </svg>
            <div className="absolute top-3 left-3 glass-card rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <MapPin className={`w-4 h-4 ${result_isPhishing(email) ? 'text-cyber-red' : 'text-cyber-green'}`} />
                <span className="text-cyber-white text-xs font-mono font-bold">{email.geoCity}, {email.geoCountry}</span>
              </div>
              <p className="text-cyber-text-muted text-xs font-mono mt-0.5">{email.geoLat.toFixed(4)}, {email.geoLon.toFixed(4)}</p>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-cyber-bg/50 border border-cyber-border text-center">
            <Globe className="w-10 h-10 text-cyber-text-muted mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-cyber-text-dim text-sm font-mono">Geolocation lookup returned no location data.</p>
            {geoMessage ? (
              <p className="text-cyber-warning text-xs font-mono mt-2 p-2 rounded-lg bg-cyber-warning/5 border border-cyber-warning/20">{geoMessage}</p>
            ) : (
              <p className="text-cyber-text-muted text-xs font-mono mt-1">No external geolocation service response received.</p>
            )}
            <p className="text-cyber-cyan text-xs font-mono mt-3">Originating IP: {email.originatingIP}</p>
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-cyber-white font-bold text-sm font-mono mb-4">IP Intelligence Table</h3>
        <DataTable rows={[
          { label: 'Originating IP', value: email.geoIP, status: result_isPhishing(email) ? 'bad' : 'neutral' },
          { label: 'City', value: email.geoCity },
          { label: 'Region', value: email.geoRegion },
          { label: 'Country', value: email.geoCountry },
          { label: 'Coordinates', value: hasGeo ? `${email.geoLat.toFixed(4)}, ${email.geoLon.toFixed(4)}` : 'N/A' },
          { label: 'ISP', value: email.geoISP },
          { label: 'Organization', value: email.geoOrg },
          { label: 'ASN', value: email.geoASN },
          { label: 'Timezone', value: email.geoTimezone },
        ]} />
      </div>
    </div>
  );
}

function result_isPhishing(email: EmailData): boolean {
  return !email.spf.startsWith('PASS') || !email.dkim.startsWith('PASS') || !email.dmarc.startsWith('PASS');
}

function HeadersTab({ email }: { email: EmailData }) {
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileSearch className="w-5 h-5 text-cyber-cyan" />
          <h2 className="text-lg font-bold text-cyber-white">Raw Header Analysis</h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-cyber-text-muted text-xs font-mono uppercase tracking-wider mb-2">Authentication Results</p>
            <div className="grid md:grid-cols-3 gap-3">
              {[{ name: 'SPF', val: email.spf }, { name: 'DKIM', val: email.dkim }, { name: 'DMARC', val: email.dmarc }].map((auth) => (
                <div key={auth.name} className={`p-4 rounded-lg border ${auth.val.startsWith('PASS') ? 'bg-cyber-green/5 border-cyber-green/20' : 'bg-cyber-red/5 border-cyber-red/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Fingerprint className="w-4 h-4 text-cyber-text-muted" />
                    <span className="text-cyber-text-dim text-xs font-mono font-bold">{auth.name}</span>
                    {auth.val.startsWith('PASS') ? <CheckCircle2 className="w-4 h-4 text-cyber-green ml-auto" /> : <XCircle className="w-4 h-4 text-cyber-red ml-auto" />}
                  </div>
                  <p className={`text-xs font-mono ${auth.val.startsWith('PASS') ? 'text-cyber-green' : 'text-cyber-red'}`}>{auth.val}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-cyber-text-muted text-xs font-mono uppercase tracking-wider mb-2">Email Metadata</p>
            <DataTable rows={[
              { label: 'From', value: email.from, status: result_isPhishing(email) ? 'bad' : 'neutral' },
              { label: 'Display Name', value: email.fromName, status: result_isPhishing(email) ? 'bad' : 'neutral' },
              { label: 'To', value: email.to },
              { label: 'Subject', value: email.subject },
              { label: 'Date', value: email.date },
              { label: 'Return-Path', value: email.returnPath, status: result_isPhishing(email) ? 'bad' : 'neutral' },
              { label: 'Reply-To', value: email.replyTo },
              { label: 'Message-ID', value: email.messageId },
            ]} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PathTab({ email }: { email: EmailData }) {
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <GitBranch className="w-5 h-5 text-cyber-cyan" />
          <h2 className="text-lg font-bold text-cyber-white">Email Path Graph Tracer</h2>
        </div>
        {email.relayHops.length > 0 ? (
          <PathGraph email={email} />
        ) : (
          <div className="p-6 rounded-xl bg-cyber-bg/50 border border-cyber-border text-center">
            <GitBranch className="w-10 h-10 text-cyber-text-muted mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-cyber-text-dim text-sm font-mono">No relay hop data available in this email.</p>
          </div>
        )}
      </div>

      {email.relayHops.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-cyber-white font-bold text-sm font-mono mb-4">Detailed Relay Path Table</h3>
          <RelayTable hops={email.relayHops} />
        </div>
      )}

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-cyber-white font-bold text-sm font-mono mb-4">Raw Received Headers</h3>
        <div className="space-y-2">
          {email.receivedHeaders.map((header, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-cyber-bg/50 border border-cyber-border">
              <span className="text-cyber-blue text-xs font-mono font-bold flex-shrink-0">[{i}]</span>
              <span className="text-cyber-text-dim text-xs font-mono break-all">{header}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PathGraph({ email }: { email: EmailData }) {
  const hops = email.relayHops;
  const nodeCount = hops.length + 1;
  const spacing = 80 / (nodeCount - 1);
  const startX = 10;
  const isThreat = result_isPhishing(email);

  const nodes = [
    { label: email.from, sub: 'Original Sender', x: startX, color: isThreat ? '#ff3355' : '#00d97e' },
    ...hops.map((hop, i) => ({
      label: hop.by.split('(')[0].trim(),
      sub: `${hop.protocol} • ${hop.ip}`,
      x: startX + (i + 1) * spacing,
      color: hop.protocol === 'HTTP' ? '#ff3355' : hop.from.includes('localhost') ? '#ff3355' : '#1e90ff',
    })),
  ];
  nodes[nodes.length - 1].color = '#00e5ff';
  nodes[nodes.length - 1].sub = email.to;

  return (
    <div className="overflow-x-auto">
      <div className="relative min-w-[700px] h-56">
        <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {nodes.map((node, i) => {
            if (i === 0) return null;
            const prev = nodes[i - 1];
            const isBad = node.color === '#ff3355' || prev.color === '#ff3355';
            return (
              <line key={i} x1={prev.x} y1={25} x2={node.x} y2={25}
                stroke={isBad ? '#ff335560' : '#1e90ff60'} strokeWidth="0.4"
                strokeDasharray="1.5 1">
                <animate attributeName="stroke-dashoffset" values="0;-2.5" dur="1.5s" repeatCount="indefinite" />
              </line>
            );
          })}
          {nodes.map((node, i) => (
            <g key={i}>
              <circle cx={node.x} cy={25} r="3" fill={node.color} opacity="0.15">
                <animate attributeName="r" values="3;4.5;3" dur="2s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
              </circle>
              <circle cx={node.x} cy={25} r="1.5" fill={node.color} style={{ filter: `drop-shadow(0 0 3px ${node.color})` }} />
              <text x={node.x} y={19} fill="#e8eef8" fontSize="1.6" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                {node.label.length > 18 ? node.label.slice(0, 16) + '...' : node.label}
              </text>
              <text x={node.x} y={31} fill="#8090b0" fontSize="1.3" textAnchor="middle" fontFamily="monospace">
                {node.sub.length > 20 ? node.sub.slice(0, 18) + '...' : node.sub}
              </text>
              <text x={node.x} y={36} fill={node.color} fontSize="1.2" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                {i === 0 ? 'ORIGIN' : i === nodes.length - 1 ? 'DESTINATION' : `HOP ${hops[i - 1].hop}`}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function DomainTab({ email }: { email: EmailData }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Building2 className="w-5 h-5 text-cyber-cyan" />
        <h2 className="text-lg font-bold text-cyber-white">Domain Intelligence</h2>
      </div>
      <DataTable rows={[
        { label: 'Domain', value: email.domain, status: result_isPhishing(email) ? 'bad' : 'neutral' },
        { label: 'Domain Age', value: email.domainAge, status: email.domainAge.includes('days') ? 'bad' : 'good' },
        { label: 'Registrar', value: email.domainRegistrar, status: result_isPhishing(email) ? 'bad' : 'neutral' },
        { label: 'Name Servers', value: email.domainNS },
        { label: 'MX Records', value: email.domainMX, status: email.domainMX.includes('No MX') || email.domainMX.includes('Not available') ? 'bad' : 'good' },
        { label: 'Originating IP', value: email.originatingIP },
      ]} />
    </div>
  );
}

function LinksTab({ email }: { email: EmailData }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Link2 className="w-5 h-5 text-cyber-cyan" />
        <h2 className="text-lg font-bold text-cyber-white">Link & Attachment Analysis</h2>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-cyber-text-muted text-xs font-mono uppercase tracking-wider mb-2">Extracted Links</p>
          {email.links.length === 0 ? (
            <p className="text-cyber-text-muted text-xs font-mono">No links found in email body</p>
          ) : (
            <div className="space-y-2">
              {email.links.map((link, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${link.suspicious ? 'bg-cyber-red/5 border-cyber-red/20' : 'bg-cyber-green/5 border-cyber-green/20'}`}>
                  {link.suspicious ? <XCircle className="w-4 h-4 text-cyber-red flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-cyber-green flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-cyber-white text-xs font-mono truncate">URL: {link.url}</p>
                    <p className="text-cyber-text-dim text-xs">Display text: "{link.text}"</p>
                    {link.redirect && <p className="text-cyber-red text-xs font-mono mt-0.5">REDIRECT CHAIN DETECTED</p>}
                  </div>
                  <span className={`text-xs font-mono font-bold ${link.suspicious ? 'text-cyber-red' : 'text-cyber-green'}`}>{link.suspicious ? 'MALICIOUS' : 'SAFE'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-cyber-text-muted text-xs font-mono uppercase tracking-wider mb-2">Attachments</p>
          {email.attachments.length === 0 ? (
            <p className="text-cyber-text-muted text-xs font-mono">No attachments found</p>
          ) : (
            <div className="space-y-2">
              {email.attachments.map((att, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${att.suspicious ? 'bg-cyber-red/5 border-cyber-red/20' : 'bg-cyber-green/5 border-cyber-green/20'}`}>
                  <FileText className={`w-4 h-4 flex-shrink-0 ${att.suspicious ? 'text-cyber-red' : 'text-cyber-green'}`} />
                  <div className="flex-1">
                    <p className="text-cyber-white text-xs font-mono">{att.name}</p>
                    <p className="text-cyber-text-dim text-xs">Type: {att.type} • Size: {att.size}</p>
                  </div>
                  <span className={`text-xs font-mono font-bold ${att.suspicious ? 'text-cyber-red' : 'text-cyber-green'}`}>{att.suspicious ? 'SUSPICIOUS' : 'SAFE'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IndicatorsTab({ result }: { result: AnalysisResult }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Activity className="w-5 h-5 text-cyber-cyan" />
        <h2 className="text-lg font-bold text-cyber-white">All Forensic Indicators</h2>
      </div>
      <IndicatorTable indicators={result.indicators} />
    </div>
  );
}

function SummaryTab({ email, result }: { email: EmailData; result: AnalysisResult }) {
  const isThreat = result.isPhishing;
  const authFailed = !email.spf.startsWith('PASS') || !email.dkim.startsWith('PASS') || !email.dmarc.startsWith('PASS');
  const hasGeo = email.geoLat !== 0 || email.geoLon !== 0;

  return (
    <div className="glass-card-blue rounded-2xl p-6 border-glow-blue">
      <div className="flex items-center gap-3 mb-4">
        <ShieldAlert className={`w-5 h-5 ${isThreat ? 'text-cyber-red' : 'text-cyber-green'}`} />
        <h2 className="text-lg font-bold text-cyber-white">Full Forensic Summary</h2>
      </div>
      <div className="space-y-4">
        <SummarySection title="Email Overview">
          The email titled "{email.subject}" was sent from <span className="text-cyber-white font-mono">{email.from}</span> (display name: "{email.fromName}") to <span className="text-cyber-white font-mono">{email.to}</span> on {email.date}. The sender domain <span className={isThreat ? 'text-cyber-red font-mono' : 'text-cyber-white font-mono'}>{email.domain}</span> was {email.domainAge}, registered via {email.domainRegistrar}.
        </SummarySection>
        <SummarySection title="Authentication Analysis">
          SPF validation <span className={email.spf.startsWith('PASS') ? 'text-cyber-green' : 'text-cyber-red'}>{email.spf.startsWith('PASS') ? 'passed' : 'failed'}</span>, DKIM signature <span className={email.dkim.startsWith('PASS') ? 'text-cyber-green' : 'text-cyber-red'}>{email.dkim.startsWith('PASS') ? 'verified successfully' : 'failed verification'}</span>, and DMARC policy <span className={email.dmarc.startsWith('PASS') ? 'text-cyber-green' : 'text-cyber-red'}>{email.dmarc.startsWith('PASS') ? 'was satisfied' : 'was violated'}</span>. {authFailed ? 'The failure of authentication mechanisms indicates this email may have been sent from unauthorized infrastructure.' : 'All authentication mechanisms passed, confirming the sender is legitimate.'}
        </SummarySection>
        <SummarySection title="Origin & Geolocation">
          {hasGeo ? (
            <>The earliest reliable sending node was traced to IP address <span className="text-cyber-red font-mono">{email.originatingIP}</span>, geolocated to {email.geoCity}, {email.geoRegion}, {email.geoCountry} (lat: {email.geoLat}, lon: {email.geoLon}). The IP is associated with {email.geoISP} ({email.geoOrg}). {isThreat ? 'This hosting infrastructure may be associated with anonymized or bulletproof hosting services.' : 'This infrastructure is consistent with legitimate corporate email systems.'}</>
          ) : (
            <>The originating IP address is <span className="text-cyber-white font-mono">{email.originatingIP}</span>. Geolocation data is not available from email headers alone — an external IP geolocation lookup service would be required to determine the physical location, ISP, and ASN associated with this IP address.</>
          )}
        </SummarySection>
        <SummarySection title="Relay Path Analysis">
          The email traversed {email.relayHops.length} relay hops. {email.receivedHeaders.some(h => h.includes('localhost') || h.includes('HTTP')) ? 'Anomalies were detected in the relay path, including localhost origin or HTTP transport, which are inconsistent with standard SMTP routing and suggest header manipulation.' : 'The relay path is consistent with standard SMTP routing through authorized mail servers.'}
        </SummarySection>
        <SummarySection title="Content & Behavioral Analysis">
          {isThreat
            ? 'Analysis detected urgency cues and/or social engineering patterns designed to induce fear and prompt hasty action. The combination of authentication status, content analysis, and link analysis contributes to the overall risk assessment.'
            : 'Analysis found no urgency cues, social engineering patterns, or deceptive language. The email content is consistent with legitimate business communication.'}
        </SummarySection>
        <SummarySection title="Attribution Assessment">
          {isThreat
            ? `Based on the convergence of evidence — authentication status, domain intelligence, content analysis, and header forensics — this email is assessed with a risk score of ${result.riskScore}/100 (${result.threatLevel.toUpperCase()}). The probable actor is operating from IP ${email.originatingIP}${hasGeo ? ` in ${email.geoCity}, ${email.geoCountry}` : ''}. Further investigation with external threat intelligence services is recommended.`
            : 'Based on all available evidence, this email is assessed with HIGH confidence as legitimate. The sender domain has established history, all authentication mechanisms pass, and the content is consistent with normal business communication.'}
        </SummarySection>
        <div className={`p-4 rounded-lg ${isThreat ? 'bg-cyber-red/5 border border-cyber-red/20' : 'bg-cyber-green/5 border border-cyber-green/20'}`}>
          <p className="text-cyber-text-muted text-xs font-mono uppercase tracking-wider mb-2">{isThreat ? 'Investigative Recommendations' : 'Assessment'}</p>
          <ul className="space-y-2">
            {isThreat ? (
              <>
                <li className="flex items-start gap-2 text-cyber-text-dim text-sm"><ArrowRight className="w-4 h-4 text-cyber-red mt-0.5 flex-shrink-0" />Preserve the email as evidence — do not delete. Maintain chain of custody for legal proceedings.</li>
                {hasGeo && <li className="flex items-start gap-2 text-cyber-text-dim text-sm"><ArrowRight className="w-4 h-4 text-cyber-red mt-0.5 flex-shrink-0" />Initiate IP trace request with {email.geoISP} for subscriber information on {email.originatingIP}.</li>}
                <li className="flex items-start gap-2 text-cyber-text-dim text-sm"><ArrowRight className="w-4 h-4 text-cyber-red mt-0.5 flex-shrink-0" />Submit domain takedown request to {email.domainRegistrar} for {email.domain}.</li>
                <li className="flex items-start gap-2 text-cyber-text-dim text-sm"><ArrowRight className="w-4 h-4 text-cyber-red mt-0.5 flex-shrink-0" />Cross-reference originating IP {email.originatingIP} with known threat intelligence databases and prior incident reports.</li>
                <li className="flex items-start gap-2 text-cyber-text-dim text-sm"><ArrowRight className="w-4 h-4 text-cyber-red mt-0.5 flex-shrink-0" />Flag for campaign correlation — search for related emails from similar domains or IPs.</li>
              </>
            ) : (
              <li className="flex items-start gap-2 text-cyber-text-dim text-sm"><ArrowRight className="w-4 h-4 text-cyber-green mt-0.5 flex-shrink-0" />No investigative action required. Email verified as legitimate through authentication and content analysis.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg bg-cyber-bg/50 border border-cyber-border">
      <p className="text-cyber-text-muted text-xs font-mono uppercase tracking-wider mb-2">{title}</p>
      <p className="text-cyber-text-dim text-sm leading-relaxed">{children}</p>
    </div>
  );
}
