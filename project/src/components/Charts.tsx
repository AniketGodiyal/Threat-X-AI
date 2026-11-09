import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { ThreatIndicator } from '@/lib/analyzer';

export function BarChart({ data }: { data: { label: string; value: number; max: number; color: string }[] }) {
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-cyber-text-dim text-xs font-mono">{item.label}</span>
            <span className="text-cyber-text text-xs font-mono font-bold">{item.value}/{item.max}</span>
          </div>
          <div className="h-2.5 bg-cyber-bg/80 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${(item.value / item.max) * 100}%`,
                background: item.color,
                boxShadow: `0 0 8px ${item.color}80`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ segments, centerLabel, centerValue }: {
  segments: { value: number; color: string; label: string }[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let cumulative = 0;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#1e2d4a" strokeWidth="14" />
          {segments.map((seg, i) => {
            const fraction = seg.value / total;
            const dash = fraction * circumference;
            const offset = -cumulative * circumference;
            cumulative += fraction;
            return (
              <circle
                key={i}
                cx="100" cy="100" r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                style={{ filter: `drop-shadow(0 0 6px ${seg.color}80)` }}
                className="transition-all duration-1000"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-cyber-text">{centerValue}</span>
          <span className="text-cyber-text-muted text-xs font-mono">{centerLabel}</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: seg.color, boxShadow: `0 0 6px ${seg.color}80` }} />
            <span className="text-cyber-text-dim text-xs font-mono">{seg.label}</span>
            <span className="text-cyber-text text-xs font-mono font-bold ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IndicatorTable({ indicators }: { indicators: ThreatIndicator[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-cyber-border">
            <th className="py-3 px-3 text-cyber-text-muted text-xs font-mono uppercase tracking-wider">Category</th>
            <th className="py-3 px-3 text-cyber-text-muted text-xs font-mono uppercase tracking-wider">Indicator</th>
            <th className="py-3 px-3 text-cyber-text-muted text-xs font-mono uppercase tracking-wider">Status</th>
            <th className="py-3 px-3 text-cyber-text-muted text-xs font-mono uppercase tracking-wider">Detail</th>
            <th className="py-3 px-3 text-cyber-text-muted text-xs font-mono uppercase tracking-wider text-right">Weight</th>
          </tr>
        </thead>
        <tbody>
          {indicators.map((ind, i) => {
            const weight = ind.status === 'fail' ? (ind.category === 'Authentication' ? 20 : ind.category === 'Link Analysis' ? 15 : 10) : 0;
            return (
              <tr key={i} className="border-b border-cyber-border/50 hover:bg-cyber-bg/30 transition-colors">
                <td className="py-3 px-3 text-cyber-text text-xs font-mono font-semibold">{ind.category}</td>
                <td className="py-3 px-3 text-cyber-text-dim text-xs font-mono">{ind.label}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    {ind.status === 'pass' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyber-green" />
                    ) : ind.status === 'fail' ? (
                      <XCircle className="w-3.5 h-3.5 text-cyber-red" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-cyber-warning" />
                    )}
                    <span className={`text-xs font-mono font-bold ${ind.status === 'pass' ? 'text-cyber-green' : ind.status === 'fail' ? 'text-cyber-red' : 'text-cyber-warning'}`}>
                      {ind.status.toUpperCase()}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 text-cyber-text-dim text-xs font-mono max-w-md">{ind.detail}</td>
                <td className="py-3 px-3 text-right">
                  <span className={`text-xs font-mono font-bold ${weight > 0 ? 'text-cyber-red' : 'text-cyber-green'}`}>
                    {weight > 0 ? `+${weight}` : '0'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RelayTable({ hops }: { hops: import('@/lib/sampleEmails').RelayHop[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-cyber-border">
            <th className="py-3 px-3 text-cyber-text-muted text-xs font-mono uppercase tracking-wider">Hop</th>
            <th className="py-3 px-3 text-cyber-text-muted text-xs font-mono uppercase tracking-wider">From (Sender Node)</th>
            <th className="py-3 px-3 text-cyber-text-muted text-xs font-mono uppercase tracking-wider">By (Receiving Server)</th>
            <th className="py-3 px-3 text-cyber-text-muted text-xs font-mono uppercase tracking-wider">Protocol</th>
            <th className="py-3 px-3 text-cyber-text-muted text-xs font-mono uppercase tracking-wider">IP Address</th>
            <th className="py-3 px-3 text-cyber-text-muted text-xs font-mono uppercase tracking-wider">Timestamp</th>
            <th className="py-3 px-3 text-cyber-text-muted text-xs font-mono uppercase tracking-wider">Delay</th>
          </tr>
        </thead>
        <tbody>
          {hops.map((hop, i) => (
            <tr key={i} className="border-b border-cyber-border/50 hover:bg-cyber-bg/30 transition-colors">
              <td className="py-3 px-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue text-xs font-mono font-bold">
                  {hop.hop}
                </span>
              </td>
              <td className="py-3 px-3 text-cyber-text text-xs font-mono">{hop.from}</td>
              <td className="py-3 px-3 text-cyber-text-dim text-xs font-mono">{hop.by}</td>
              <td className="py-3 px-3">
                <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${
                  hop.protocol === 'HTTP' ? 'bg-cyber-red/10 text-cyber-red' :
                  hop.protocol.includes('SA') ? 'bg-cyber-green/10 text-cyber-green' :
                  'bg-cyber-blue/10 text-cyber-blue'
                }`}>
                  {hop.protocol}
                </span>
              </td>
              <td className="py-3 px-3 text-cyber-text text-xs font-mono font-semibold">{hop.ip}</td>
              <td className="py-3 px-3 text-cyber-text-dim text-xs font-mono">{hop.timestamp}</td>
              <td className="py-3 px-3 text-cyber-text-dim text-xs font-mono">{hop.delay}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DataTable({ rows }: { rows: { label: string; value: string; status?: 'good' | 'bad' | 'neutral' }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-cyber-border/50 hover:bg-cyber-bg/30 transition-colors">
              <td className="py-3 px-4 text-cyber-text-muted text-xs font-mono uppercase tracking-wider w-1/3">{row.label}</td>
              <td className={`py-3 px-4 text-xs font-mono ${
                row.status === 'good' ? 'text-cyber-green' :
                row.status === 'bad' ? 'text-cyber-red' :
                'text-cyber-text'
              }`}>
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
