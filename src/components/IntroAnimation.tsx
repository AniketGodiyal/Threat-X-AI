import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

export function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'reveal' | 'tagline' | 'done'>('loading');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 600);
    const t2 = setTimeout(() => setPhase('tagline'), 2200);
    const t3 = setTimeout(() => setPhase('done'), 3800);
    const t4 = setTimeout(() => onComplete(), 4400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-cyber-bg transition-opacity duration-500 ${phase === 'done' ? 'opacity-0' : 'opacity-100'}`}>
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-cyber-blue/10 border border-cyber-blue/30 mb-8 transition-all duration-700 ${phase === 'loading' ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`}
          style={{ boxShadow: phase !== 'loading' ? '0 0 40px rgba(0,229,255,0.3)' : 'none' }}
        >
          <Shield className={`w-12 h-12 text-cyber-cyan transition-all duration-700 ${phase === 'loading' ? 'opacity-0' : 'opacity-100'}`} strokeWidth={1.5} />
        </div>

        <div className="overflow-hidden h-20 mb-4">
          <h1 className={`text-6xl md:text-7xl font-bold tracking-tight transition-transform duration-1000 ${phase === 'loading' ? 'translate-y-full' : 'translate-y-0'}`}>
            <span className="text-cyber-cyan text-glow-cyan">THREAT</span>
            <span className="text-cyber-white">X</span>
          </h1>
        </div>

        <div className="overflow-hidden h-8">
          <p className={`text-cyber-text-dim text-sm font-mono transition-all duration-700 ${phase === 'tagline' || phase === 'done' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            AI-Powered Email Threat Detection
          </p>
        </div>

        <div className={`mt-8 transition-opacity duration-500 ${phase === 'loading' ? 'opacity-0' : 'opacity-100'}`}>
          <div className="w-48 h-0.5 bg-cyber-border mx-auto rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan rounded-full" style={{ width: phase === 'tagline' || phase === 'done' ? '100%' : '30%', transition: 'width 2s ease-out' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
