import { useState, useRef } from 'react';
import {
  Upload, FileText, ArrowLeft, Shield, ShieldCheck, ShieldAlert,
  AlertTriangle, CheckCircle2, XCircle, Info, Gauge, Mail, ArrowRight,
  ListChecks, BookOpen, Lightbulb, Download,
} from 'lucide-react';
import { sampleEmails, type SampleEmail, type EmailData } from '@/lib/sampleEmails';
import { analyzeEmailWithML, type AnalysisResult, type MLPrediction } from '@/lib/analyzer';
import { fetchMLPrediction } from '@/lib/mlService';
import { parseEml } from '@/lib/emlParser';
import { fetchGeoData, type GeoData } from '@/lib/geoService';
import { downloadFullReport } from '@/lib/reportGenerator';
import { supabase } from '@/lib/supabase';
import { ScanAnimation } from './ScanAnimation';
import { ResultsNav, ResultsPagination, type TabConfig } from './ResultsNav';
import { BarChart, DonutChart, IndicatorTable } from './Charts';

type CitizenStep = 'upload' | 'scanning' | 'results';
type CitizenTab = 'risk' | 'reasons' | 'indicators' | 'evaluation' | 'recommendations';

export function CitizenPortal({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<CitizenStep>('upload');
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CitizenTab>('risk');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [mlPrediction, setMlPrediction] = useState<MLPrediction | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
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
      setUploadedFile(file.name);
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
    setUploadedFile(`${email.label}.eml`);
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
        portal: 'citizen',
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
    setUploadedFile(null);
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
      portal: 'citizen',
      caseId: `THREATX-${Date.now().toString().slice(-8)}`,
      generatedAt: new Date().toISOString(),
    });
  };

  if (step === 'scanning') return <ScanAnimation onComplete={handleScanComplete} />;

  const tabs: (TabConfig & { id: CitizenTab })[] = [
    { id: 'risk', label: 'Risk Score', icon: <Gauge className="w-4 h-4" /> },
    { id: 'reasons', label: 'Why Phishing', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'indicators', label: 'Indicators', icon: <ListChecks className="w-4 h-4" /> },
    { id: 'evaluation', label: 'How It Works', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'recommendations', label: 'What To Do', icon: <Lightbulb className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-cyber-text-dim hover:text-cyber-cyan text-sm font-mono transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Portal Selection
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyber-cyan" strokeWidth={1.5} />
            <span className="text-cyber-text-dim text-sm font-mono">Citizen Portal</span>
          </div>
        </div>

        {step === 'upload' && (
          <div className="animate-fade-in-up">
            <h1 className="text-3xl font-bold text-cyber-white mb-2">Email Threat Scanner</h1>
            <p className="text-cyber-text-dim text-sm font-mono mb-8">Upload a suspicious .eml file to analyze it for phishing and fraud indicators</p>
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
              className={`glass-card rounded-2xl p-8 mb-4 border-2 border-dashed cursor-pointer transition-all-smooth ${isDragging ? 'border-cyber-cyan bg-cyber-cyan/5' : 'border-cyber-border hover:border-cyber-cyan/30'}`}
            >
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/20 mb-4">
                  <Upload className="w-8 h-8 text-cyber-cyan" strokeWidth={1.5} />
                </div>
                <p className="text-cyber-white font-semibold mb-1">Drop .eml files here or click to browse</p>
                <p className="text-cyber-text-muted text-xs font-mono">or select a sample email below to scan</p>
              </div>
            </div>
            {error && <p className="text-cyber-error text-xs font-mono mb-4 text-center">{error}</p>}
            <div className="mb-4">
              <p className="text-cyber-text-dim text-xs font-mono uppercase tracking-wider mb-4">Or select a sample email to scan</p>
              <div className="grid md:grid-cols-2 gap-4">
                {sampleEmails.map((email) => (
                  <button key={email.id} onClick={() => handleEmailSelect(email)}
                    className="glass-card rounded-xl p-5 text-left transition-all-smooth hover:border-cyber-cyan/40 hover:bg-cyber-cyan/5 group animate-fade-in-up">
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
                      <span className="text-cyber-cyan text-xs font-mono flex items-center gap-1 group-hover:gap-2 transition-all">Scan now <ArrowRight className="w-3 h-3" /></span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'results' && result && selectedEmail && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h1 className="text-3xl font-bold text-cyber-white">Scan Results</h1>
              <div className="flex items-center gap-3">
                {uploadedFile && (
                  <div className="flex items-center gap-2 text-cyber-text-muted text-xs font-mono"><FileText className="w-4 h-4" />{uploadedFile}</div>
                )}
                <button onClick={handleDownloadReport} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue text-xs font-mono hover:bg-cyber-blue/20 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Full Report
                </button>
              </div>
            </div>

            <ResultsNav tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as CitizenTab)} />

            <div key={activeTab} className="animate-fade-in min-h-[400px]">
              {activeTab === 'risk' && (
                <div className="space-y-6">
                  <div className="glass-card rounded-2xl p-8 border-glow-cyan">
                    <div className="flex items-center gap-4 mb-6">
                      <Gauge className="w-6 h-6 text-cyber-cyan" strokeWidth={1.5} />
                      <h2 className="text-lg font-bold text-cyber-white">Combined Risk Score</h2>
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
                            <p className="text-cyber-text-dim text-xs font-mono">{result.isPhishing ? 'This email is likely a phishing attempt' : 'No significant threats detected'}</p>
                          </div>
                        </div>
                        {mlLoading ? (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-cyber-bg/50 border border-cyber-cyan/20">
                            <div className="w-5 h-5 rounded-full border-2 border-cyber-cyan border-t-transparent animate-spin" />
                            <p className="text-cyber-text-dim text-xs font-mono">AI model analyzing email content...</p>
                          </div>
                        ) : result.mlPrediction ? (
                          <div className={`flex items-center gap-3 p-4 rounded-xl border ${result.mlPrediction.phishingProbability > 0.5 ? 'bg-cyber-red/5 border-cyber-red/20' : 'bg-cyber-green/5 border-cyber-green/20'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${result.mlPrediction.phishingProbability > 0.5 ? 'bg-cyber-red/10' : 'bg-cyber-green/10'}`}>
                              <span className="text-xs font-mono font-bold">AI</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-cyber-white text-xs font-mono font-bold">DistilBERT ML Prediction</p>
                              <p className="text-cyber-text-dim text-xs font-mono">
                                {Math.round(result.mlPrediction.phishingProbability * 100)}% phishing &middot; {Math.round((1 - result.mlPrediction.phishingProbability) * 100)}% safe
                              </p>
                            </div>
                            <span className={`text-xs font-mono font-bold ${result.mlPrediction.phishingProbability > 0.5 ? 'text-cyber-red' : 'text-cyber-green'}`}>
                              {result.mlPrediction.label.toUpperCase()}
                            </span>
                          </div>
                        ) : null}
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-cyber-bg/50 border border-cyber-border">
                          <Mail className="w-5 h-5 text-cyber-text-muted" />
                          <div>
                            <p className="text-cyber-text-dim text-xs font-mono">From: {selectedEmail.from}</p>
                            <p className="text-cyber-text-dim text-xs font-mono">Subject: {selectedEmail.subject}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-cyber-white font-bold text-sm font-mono mb-4">Risk Score by Category</h3>
                    <BarChart data={[
                      { label: 'Authentication (SPF/DKIM/DMARC)', value: result.categoryScores['Authentication'] || 0, max: 55, color: (result.categoryScores['Authentication'] || 0) > 0 ? '#ff3355' : '#00d97e' },
                      { label: 'Domain Intelligence', value: result.categoryScores['Domain Intelligence'] || 0, max: 25, color: (result.categoryScores['Domain Intelligence'] || 0) > 0 ? '#ff3355' : '#00d97e' },
                      { label: 'Content / NLP Analysis', value: result.categoryScores['Content Analysis'] || 0, max: 10, color: (result.categoryScores['Content Analysis'] || 0) > 0 ? '#ff3355' : '#00d97e' },
                      { label: 'Link Analysis', value: result.categoryScores['Link Analysis'] || 0, max: 15, color: (result.categoryScores['Link Analysis'] || 0) > 0 ? '#ff3355' : '#00d97e' },
                    ]} />
                  </div>
                </div>
              )}

              {activeTab === 'reasons' && (
                <div className="glass-card-red rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldAlert className="w-5 h-5 text-cyber-red" />
                    <h2 className="text-lg font-bold text-cyber-white">{result.isPhishing ? 'Why This Email is Phishing' : 'Analysis Summary'}</h2>
                  </div>
                  <ul className="space-y-3">
                    {result.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-3 text-cyber-text-dim text-sm">
                        <XCircle className="w-4 h-4 text-cyber-red mt-0.5 flex-shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === 'indicators' && (
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <ListChecks className="w-5 h-5 text-cyber-cyan" />
                    <h2 className="text-lg font-bold text-cyber-white">Threat Indicators</h2>
                  </div>
                  <div className="mb-6">
                    <DonutChart
                      segments={[
                        { value: result.indicators.filter(i => i.status === 'pass').length, color: '#00d97e', label: 'Passed' },
                        { value: result.indicators.filter(i => i.status === 'fail').length, color: '#ff3355', label: 'Failed' },
                        { value: result.indicators.filter(i => i.status === 'warn').length, color: '#ffaa00', label: 'Warnings' },
                      ]}
                      centerLabel="Checks"
                      centerValue={`${result.indicators.length}`}
                    />
                  </div>
                  <IndicatorTable indicators={result.indicators} />
                </div>
              )}

              {activeTab === 'evaluation' && (
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Info className="w-5 h-5 text-cyber-cyan" />
                    <h2 className="text-lg font-bold text-cyber-white">How This Evaluation Works</h2>
                  </div>
                  <p className="text-cyber-text-dim text-sm leading-relaxed">{result.evaluation}</p>
                </div>
              )}

              {activeTab === 'recommendations' && (
                <div className="glass-card rounded-2xl p-6 border border-cyber-green/20">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="w-5 h-5 text-cyber-green" />
                    <h2 className="text-lg font-bold text-cyber-white">What To Do Next</h2>
                  </div>
                  <ul className="space-y-3">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3 text-cyber-text-dim text-sm">
                        <div className="w-6 h-6 rounded-full bg-cyber-green/10 border border-cyber-green/30 flex items-center justify-center flex-shrink-0 text-cyber-green text-xs font-bold">{i + 1}</div>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <ResultsPagination tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as CitizenTab)} />

            <button onClick={handleReset} className="w-full bg-cyber-blue hover:bg-cyber-blue-bright text-white font-semibold py-3.5 rounded-xl transition-all-smooth flex items-center justify-center gap-2 mt-6">
              Scan Another Email <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
