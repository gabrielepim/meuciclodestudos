import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, CheckSquare, AlertCircle, TrendingUp, BarChart3, Target } from "lucide-react";
import { api, type DashboardKPIs } from "@/integrations/api/client";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function kpiColor(hours: number) {
  if (hours >= 2) return { cls: "kpi-green border", text: "text-[color:var(--success)]", dot: "bg-[color:var(--success)]", label: "Ótimo" };
  if (hours >= 1) return { cls: "kpi-yellow border", text: "text-[color:var(--warning)]", dot: "bg-[color:var(--warning)]", label: "Bom" };
  return { cls: "kpi-red border", text: "text-[color:var(--danger)]", dot: "bg-[color:var(--danger)]", label: "Fraco" };
}

function CalendarHeatmap({ data }: { data: Array<{ day: string; duration_seconds: number }> }) {
  const map = new Map(data.map(d => [d.day, d.duration_seconds]));
  const weeks: string[][] = [];
  const today = new Date();
  const end = new Date(today); end.setDate(end.getDate() - end.getDay());
  const start = new Date(end); start.setDate(start.getDate() - 11 * 7);
  for (let w = 0; w < 12; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      week.push(date.toISOString().slice(0, 10));
    }
    weeks.push(week);
  }
  const intensity = (sec: number) => {
    if (!sec) return "bg-muted/40";
    const h = sec / 3600;
    if (h >= 2) return "bg-[color:var(--success)]/80";
    if (h >= 1) return "bg-[color:var(--warning)]/70";
    return "bg-[color:var(--danger)]/50";
  };
  const days = ["D", "S", "T", "Q", "Q", "S", "S"];
  return (
    <div>
      <div className="flex gap-1 mb-1">
        <div className="flex flex-col gap-1 pr-1">
          {days.map((d, i) => (
            <div key={i} className="h-3 w-3 text-[9px] text-muted-foreground flex items-center">{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => {
              const sec = map.get(day) ?? 0;
              const h = sec ? `${(sec / 3600).toFixed(1)}h em ${day}` : day;
              return (
                <div key={day} title={h} className={`h-3 w-3 rounded-sm transition-all hover:ring-1 hover:ring-primary/50 ${intensity(sec)}`} />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
        <span>Menos</span>
        <div className="h-2.5 w-2.5 rounded-sm bg-muted/40" />
        <div className="h-2.5 w-2.5 rounded-sm bg-[color:var(--danger)]/50" />
        <div className="h-2.5 w-2.5 rounded-sm bg-[color:var(--warning)]/70" />
        <div className="h-2.5 w-2.5 rounded-sm bg-[color:var(--success)]/80" />
        <span>Mais</span>
      </div>
    </div>
  );
}

function Dashboard() {
  const [kpi, setKpi] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard.kpis().then(d => { setKpi(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}
      </div>
    </div>
  );

  const total = kpi ?? { total_hours: 0, total_answered: 0, total_wrong: 0, subjects: [], calendar: [] };
  const accuracy = total.total_answered > 0
    ? Math.round(((total.total_answered - total.total_wrong) / total.total_answered) * 100)
    : null;

  return (
    <div className="space-y-8">
      <div className="fade-up">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do seu progresso de estudos.</p>
      </div>

      {/* Top KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3 fade-up fade-up-1">
        {[
          { icon: Clock, label: "Horas estudadas", value: `${total.total_hours.toFixed(1)}h`, color: "text-primary", bg: "bg-primary/10" },
          { icon: CheckSquare, label: "Questões respondidas", value: total.total_answered, color: "text-blue-400", bg: "bg-blue-400/10" },
          { icon: AlertCircle, label: "Erros registrados", value: total.total_wrong, color: "text-[color:var(--danger)]", bg: "bg-[color:var(--danger)]/10" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 card-glow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
              <div className={`rounded-lg ${bg} p-2`}><Icon className={`h-4 w-4 ${color}`} /></div>
            </div>
            <div className={`text-3xl font-bold tabular-nums ${color}`}>{value}</div>
            {accuracy !== null && label === "Questões respondidas" && (
              <div className="mt-1 text-xs text-muted-foreground">{accuracy}% de acerto</div>
            )}
          </div>
        ))}
      </div>

      {/* Calendar heatmap */}
      {total.calendar.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 card-glow fade-up fade-up-2">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Atividade — últimas 12 semanas</h2>
          </div>
          <div className="overflow-x-auto">
            <CalendarHeatmap data={total.calendar} />
          </div>
        </div>
      )}

      {/* Subject KPIs */}
      {total.subjects.length > 0 && (
        <div className="space-y-4 fade-up fade-up-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">KPIs por Matéria</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {total.subjects.map((s, i) => {
              const c = kpiColor(s.hours);
              const acc = s.questions_answered > 0
                ? Math.round(((s.questions_answered - s.questions_wrong) / s.questions_answered) * 100)
                : null;
              return (
                <div key={s.subject} className={`rounded-2xl border p-5 transition-all hover:scale-[1.02] ${c.cls}`} style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm font-semibold leading-tight">{s.subject}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${c.text}`}>{c.label}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className={`font-mono text-xl font-bold ${c.text}`}>{s.hours.toFixed(1)}h</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">estudadas</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono text-xl font-bold text-blue-400">{s.questions_answered}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">questões</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono text-xl font-bold text-[color:var(--danger)]">{s.questions_wrong}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">erros</div>
                    </div>
                  </div>
                  {acc !== null && (
                    <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${acc >= 70 ? "bg-[color:var(--success)]" : acc >= 50 ? "bg-[color:var(--warning)]" : "bg-[color:var(--danger)]"}`}
                        style={{ width: `${acc}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {total.subjects.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center fade-up fade-up-2">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium">Nenhuma sessão registrada ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Inicie um ciclo de estudo para ver seus KPIs aqui.</p>
        </div>
      )}
    </div>
  );
}
