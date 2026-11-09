import { User, Shield, ArrowRight } from 'lucide-react';

interface PortalSelectionProps {
  onSelect: (portal: 'citizen' | 'law_enforcement') => void;
}

export function PortalSelection({ onSelect }: PortalSelectionProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl animate-fade-in-up">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyber-blue" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold">
              <span className="text-cyber-cyan text-glow-cyan">THREAT</span>X
            </h1>
          </div>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-cyber-text mb-3">Select Your Portal</h2>
          <p className="text-cyber-text-dim text-sm font-mono">
            Choose the access level appropriate for your role
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => onSelect('citizen')}
            className="group glass-card-blue rounded-2xl p-8 text-left transition-all-smooth hover:border-cyber-cyan/40 hover:bg-cyber-cyan/5 animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 mb-5 group-hover:scale-110 transition-transform">
              <User className="w-8 h-8 text-cyber-cyan" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-cyber-text mb-2">Citizen Portal</h3>
            <p className="text-cyber-text-dim text-sm mb-5">
              Upload and scan suspicious emails for phishing threats. Get a risk score and clear guidance on what to do next.
            </p>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-cyber-text-muted text-xs font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan" />
                Email threat detection
              </div>
              <div className="flex items-center gap-2 text-cyber-text-muted text-xs font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan" />
                Risk score out of 100
              </div>
              <div className="flex items-center gap-2 text-cyber-text-muted text-xs font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan" />
                Action recommendations
              </div>
              <div className="flex items-center gap-2 text-cyber-text-muted text-xs font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan/50" />
                No geolocation data exposed
              </div>
            </div>
            <div className="flex items-center gap-2 text-cyber-cyan text-sm font-semibold group-hover:gap-3 transition-all">
              Enter Citizen Portal
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          <button
            onClick={() => onSelect('law_enforcement')}
            className="group glass-card-blue rounded-2xl p-8 text-left transition-all-smooth hover:border-cyber-blue/50 hover:bg-cyber-blue/5 animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-cyber-blue/10 border border-cyber-blue/30 mb-5 group-hover:scale-110 transition-transform animate-pulse-blue">
              <Shield className="w-8 h-8 text-cyber-blue" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-cyber-text mb-2">Law Enforcement Portal</h3>
            <p className="text-cyber-text-dim text-sm mb-5">
              Full forensic intelligence suite with geolocation tracing, raw header analysis, email path graphs, and detailed investigative reports.
            </p>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-cyber-text-muted text-xs font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-blue" />
                Full geolocation & IP tracing
              </div>
              <div className="flex items-center gap-2 text-cyber-text-muted text-xs font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-blue" />
                Raw header forensic analysis
              </div>
              <div className="flex items-center gap-2 text-cyber-text-muted text-xs font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-blue" />
                Email path graph tracer
              </div>
              <div className="flex items-center gap-2 text-cyber-text-muted text-xs font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-cyber-blue" />
                Complete forensic summary report
              </div>
            </div>
            <div className="flex items-center gap-2 text-cyber-blue text-sm font-semibold group-hover:gap-3 transition-all">
              Enter Law Enforcement Portal
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
