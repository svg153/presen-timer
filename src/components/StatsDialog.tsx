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
import { useI18n } from '@/i18n';

interface StatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: PresentationStats | null;
}

const toMinutes = (seconds: number) => Math.round((seconds / 60) * 10) / 10;

const StatsDialog = ({ open, onOpenChange, stats }: StatsDialogProps) => {
  const { t } = useI18n();
  const hasData = stats !== null && stats.sections.length > 0;

  const handleCopy = async () => {
    if (!stats) return;
    try {
      await navigator.clipboard.writeText(
        buildStatsText(stats, {
          title: t('stats.title'),
          headers: [t('stats.section'), t('stats.planned'), t('stats.actual'), t('stats.diff')],
          total: t('stats.total')
        })
      );
      toast({
        title: t('stats.copiedTitle'),
        description: t('stats.copiedDesc')
      });
    } catch {
      toast({
        title: t('stats.copyFailedTitle'),
        description: t('stats.copyFailedDesc')
      });
    }
  };

  const totalPlanned = hasData ? stats!.sections.reduce((t, s) => t + s.planned, 0) : 0;
  const totalActual = hasData ? stats!.sections.reduce((t, s) => t + s.actual, 0) : 0;

  // Chart series keys follow the UI language so the legend stays translated.
  const plannedKey = t('stats.planned');
  const actualKey = t('stats.actual');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-github-dark border-github-subtle">
        <DialogHeader>
          <DialogTitle className="text-github-light flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-github-purple" />
            {t('stats.title')}
          </DialogTitle>
          <DialogDescription className="text-github-muted">
            {t('stats.subtitle')}
          </DialogDescription>
        </DialogHeader>

        {!hasData ? (
          <p className="py-8 text-center text-github-muted">
            {t('stats.empty')}
          </p>
        ) : (
          <div className="space-y-6">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats!.sections.map(s => ({ name: s.name, [plannedKey]: toMinutes(s.planned), [actualKey]: toMinutes(s.actual) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--github-subtle))" />
                  <XAxis dataKey="name" tick={{ fill: 'rgb(var(--github-muted))', fontSize: 11 }} interval={0} />
                  <YAxis tick={{ fill: 'rgb(var(--github-muted))', fontSize: 11 }} tickFormatter={(v: number) => `${v}m`} />
                  <Tooltip
                    contentStyle={{ background: 'rgb(var(--github-dark))', border: '1px solid rgb(var(--github-subtle))', borderRadius: 6 }}
                    labelStyle={{ color: 'rgb(var(--github-text))' }}
                    formatter={(value) => [`${value} ${t('stats.minutes')}`]}
                  />
                  <Legend />
                  <Bar dataKey={plannedKey} fill="rgb(var(--github-muted))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey={actualKey} fill="rgb(var(--github-purple))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-github-muted border-b border-github-subtle">
                  <th className="py-2 pr-2 font-medium">{t('stats.section')}</th>
                  <th className="py-2 px-2 font-medium text-right">{t('stats.planned')}</th>
                  <th className="py-2 px-2 font-medium text-right">{t('stats.actual')}</th>
                  <th className="py-2 pl-2 font-medium text-right">{t('stats.diff')}</th>
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
                  <td className="py-2 pr-2">{t('stats.total')}</td>
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
                {t('stats.copy')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StatsDialog;
