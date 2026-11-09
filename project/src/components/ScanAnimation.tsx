import { useEffect, useState } from 'react';
import { ShieldAlert, Radar, Cpu, Scan, Fingerprint, Network, Globe, Lock } from 'lucide-react';

interface ScanAnimationProps {
  onComplete: () => void;
  duration?: number;
}

const stages = [
  { icon: Scan, label: 'Parsing email headers...', delay: 0 },
  { icon: Fingerprint, label: 'Verifying SPF / DKIM / DMARC...', delay: 1.5 },
  { icon: Network, label: 'Tracing relay path...', delay: 3 },
  { icon: Cpu, label: 'Running NLP threat models...', delay: 4.5 },
  { icon: Radar, label: 'Scanning links & attachments...', delay: 6 },
  { icon: Globe, label: 'Correlating IP intelligence...', delay: 7.5 },
  { icon: Lock, label: 'Computing risk score...', delay: 9 },
  { icon: ShieldAlert, label: 'Generating forensic report...', delay: 10.5 },
];

export function ScanAnimation({ onComplete, duration = 12 }: ScanAnimationProps) {
  const [activeStage, setActiveStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressInterval = 50;
    const totalSteps = (duration * 1000) / progressInterval;

    let currentStep = 0;
    const progressTimer = setInterval(() => {
      currentStep++;
      setProgress(Math.min((currentStep / totalSteps) * 100, 100));
      const stageIndex = Math.min(
        Math.floor((currentStep / totalSteps) * stages.length),
        stages.length - 1
      );
      setActiveStage(stageIndex);
      if (currentStep >= totalSteps) {
        clearInterval(progressTimer);
      }
    }, progressInterval);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, duration * 1000);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-cyber-blue/10 border border-cyber-blue/30 mb-6 border-glow-blue relative">
            <ShieldAlert className="w-12 h-12 text-cyber-cyan animate-pulse" strokeWidth={1.5} />
            <div className="absolute inset-0 rounded-2xl border-2 border-cyber-cyan/20 animate-ping" />
          </div>
          <h2 className="text-2xl font-bold text-cyber-white mb-2 text-glow-cyan">
            THREAT DETECTION IN PROGRESS
          </h2>
          <p className="text-cyber-text-dim text-sm font-mono">
            Analyzing email for threats and forensic indicators...
          </p>
        </div>

        <div className="glass-card-blue rounded-2xl p-8 border-glow-cyan relative overflow-hidden">
          <div className="scan-line-overlay" />

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyber-text-dim text-xs font-mono uppercase tracking-wider">
                Scan Progress
              </span>
              <span className="text-cyber-cyan text-sm font-mono font-bold">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 bg-cyber-bg/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyber-blue-dim via-cyber-blue to-cyber-cyan rounded-full transition-all duration-100"
                style={{ width: `${progress}%`, boxShadow: '0 0 15px #00e5ff' }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {stages.map((stage, i) => {
              const isActive = i === activeStage;
              const isDone = i < activeStage;
              const Icon = stage.icon;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all-smooth ${
                    isActive
                      ? 'bg-cyber-cyan/10 border border-cyber-cyan/30'
                      : isDone
                      ? 'opacity-50'
                      : 'opacity-25'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isActive
                        ? 'text-cyber-cyan animate-spin-slow'
                        : isDone
                        ? 'text-cyber-green'
                        : 'text-cyber-text-muted'
                    }`}
                    strokeWidth={1.5}
                  />
                  <span
                    className={`text-sm font-mono ${
                      isActive ? 'text-cyber-white' : isDone ? 'text-cyber-green' : 'text-cyber-text-muted'
                    }`}
                  >
                    {stage.label}
                  </span>
                  {isDone && <span className="ml-auto text-cyber-green text-xs font-mono">DONE</span>}
                  {isActive && (
                    <span className="ml-auto text-cyber-cyan text-xs font-mono animate-flicker">
                      SCANNING...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-cyber-text-muted text-xs font-mono mt-6 animate-flicker">
          [ THREATX FORENSIC ENGINE v3.0 — DO NOT CLOSE THIS WINDOW ]
        </p>
      </div>
    </div>
  );
}
