import { BarChart3, Copy } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatTime } from '@/utils/timerUtils';
import { PresentationStats, buildStatsText } from '@/utils/statsUtils';

interface StatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: PresentationStats | null;
}

const toMinutes = (seconds: number) => Math.round((seconds / 60) * 10) / 10;

const StatsDialog = ({ open, onOpenChange, stats }: StatsDialogProps) => {
  const hasData = stats !== null && stats.sections.length > 0;

  const handleCopy = async () => {
    if (!stats) return;
    try {
      await navigator.clipboard.writeText(buildStatsText(stats));
      toast({
        title: "Copied",
        description: "Summary copied to clipboard"
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not access the clipboard"
      });
    }
  };

  const totalPlanned = hasData ? stats!.sections.reduce((t, s) => t + s.planned, 0) : 0;
  const totalActual = hasData ? stats!.sections.reduce((t, s) => t + s.actual, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-github-dark border-github-subtle">
        <DialogHeader>
          <DialogTitle className="text-github-light flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-github-purple" />
            Presentation summary
          </DialogTitle>
          <DialogDescription className="text-github-muted">
            Planned vs actual time per section
          </DialogDescription>
        </DialogHeader>

        {!hasData ? (
          <p className="py-8 text-center text-github-muted">
            No stats recorded yet. Run a presentation to see the summary.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats!.sections.map(s => ({ name: s.name, Planned: toMinutes(s.planned), Actual: toMinutes(s.actual) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} interval={0} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={(v: number) => `${v}m`} />
                  <Tooltip
                    contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 6 }}
                    labelStyle={{ color: '#c9d1d9' }}
                    formatter={(value) => [`${value} min`]}
                  />
                  <Legend />
                  <Bar dataKey="Planned" fill="#8b949e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Actual" fill="#8957e5" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-github-muted border-b border-github-subtle">
                  <th className="py-2 pr-2 font-medium">Section</th>
                  <th className="py-2 px-2 font-medium text-right">Planned</th>
                  <th className="py-2 px-2 font-medium text-right">Actual</th>
                  <th className="py-2 pl-2 font-medium text-right">Diff</th>
                </tr>
              </thead>
              <tbody>
                {stats!.sections.map((s, i) => {
                  const diff = s.actual - s.planned;
                  return (
                    <tr key={i} className="border-b border-github-subtle/50 text-github-text">
                      <td className="py-2 pr-2 truncate max-w-[180px]" title={s.name}>{s.name}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatTime(s.planned)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatTime(s.actual)}</td>
                      <td className={`py-2 pl-2 text-right tabular-nums ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-github-green' : 'text-github-muted'}`}>
                        {diff > 0 ? '+' : ''}{formatTime(diff)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="text-github-light font-medium">
                  <td className="py-2 pr-2">Total</td>
                  <td className="py-2 px-2 text-right tabular-nums">{formatTime(totalPlanned)}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{formatTime(totalActual)}</td>
                  <td className={`py-2 pl-2 text-right tabular-nums ${totalActual - totalPlanned > 0 ? 'text-red-400' : totalActual - totalPlanned < 0 ? 'text-github-green' : 'text-github-muted'}`}>
                    {totalActual - totalPlanned > 0 ? '+' : ''}{formatTime(totalActual - totalPlanned)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="bg-github-subtle border-github-subtle hover:bg-github-subtle/80"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy summary
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StatsDialog;
