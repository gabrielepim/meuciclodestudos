import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload, BookOpen, Layers, GitBranch, Sparkles, Trash2, ChevronLeft,
  ChevronRight, RotateCcw, Search, FileText, Clock, Filter, X,
  ChevronDown, ChevronUp, Zap, Eye, EyeOff, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type StudyMaterial, type Flashcard, type MindMapNode } from "@/integrations/api/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/materiais")({
  component: MateriaisPage,
});

// ── Sub-views ─────────────────────────────────────────────────────────────────
type View = "repo" | "upload" | "detail";
type DetailTab = "flashcards" | "resumo" | "mapa";

// ── Mind Map renderer (SVG-based, recursive) ────────────────────────────────
function MindMapNode({
  node, x, y, depth = 0, angle = 0, spread = Math.PI,
}: {
  node: MindMapNode; x: number; y: number; depth?: number;
  angle?: number; spread?: number;
}) {
  if (!node) return null;
  const RADII = [0, 140, 220, 280];
  const COLORS = ["#818cf8", "#34d399", "#f59e0b", "#f472b6"];
  const FONT_SIZES = [15, 13, 11, 10];
  const r = RADII[Math.min(depth, 3)];
  const childCount = node.children?.length || 0;

  const children = node.children || [];
  const angleStep = childCount > 1 ? spread / (childCount - 1) : 0;
  const startAngle = angle - spread / 2;

  return (
    <g>
      {/* Node circle + label */}
      <g>
        {depth > 0 && (
          <circle cx={x} cy={y} r={depth === 1 ? 52 : depth === 2 ? 42 : 32}
            fill={`${COLORS[depth - 1]}18`}
            stroke={COLORS[depth - 1]}
            strokeWidth={depth === 1 ? 1.5 : 1}
          />
        )}
        {depth === 0 && (
          <circle cx={x} cy={y} r={64} fill="#818cf820" stroke="#818cf8" strokeWidth={2} />
        )}
        <foreignObject
          x={x - (depth === 0 ? 56 : depth === 1 ? 44 : 36)}
          y={y - 18}
          width={depth === 0 ? 112 : depth === 1 ? 88 : 72}
          height={36}
        >
          <div
            style={{
              fontSize: FONT_SIZES[Math.min(depth, 3)],
              color: depth === 0 ? "#c7d2fe" : COLORS[Math.min(depth - 1, 3)],
              textAlign: "center",
              lineHeight: 1.2,
              fontWeight: depth <= 1 ? 600 : 500,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            } as React.CSSProperties}
          >
            {node.label}
          </div>
        </foreignObject>
      </g>

      {/* Children */}
      {children.map((child, i) => {
        const childAngle = childCount === 1 ? angle : startAngle + angleStep * i;
        const cx = x + Math.cos(childAngle) * r;
        const cy = y + Math.sin(childAngle) * r;
        const color = COLORS[Math.min(depth, 3)];
        return (
          <g key={i}>
            <line
              x1={x} y1={y} x2={cx} y2={cy}
              stroke={color}
              strokeWidth={depth === 0 ? 1.5 : 1}
              strokeOpacity={0.5}
              strokeDasharray={depth > 0 ? "4 3" : undefined}
            />
            <MindMapNode
              node={child} x={cx} y={cy}
              depth={depth + 1}
              angle={childAngle}
              spread={Math.max(spread / Math.max(childCount, 1.5), Math.PI / 6)}
            />
          </g>
        );
      })}
    </g>
  );
}

function MindMapView({ mindMap }: { mindMap: MindMapNode }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const W = 900, H = 700, CX = W / 2, CY = H / 2;

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.4, Math.min(2, z - e.deltaY * 0.001)));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setPan(p => ({ x: p.x + e.clientX - lastPos.current.x, y: p.y + e.clientY - lastPos.current.y }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { dragging.current = false; };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card" style={{ height: 480 }}>
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        <button onClick={() => setZoom(z => Math.min(2, z + 0.15))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors">+</button>
        <button onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors">−</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/50 z-10 pointer-events-none">
        Scroll para zoom · Arraste para mover
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full cursor-grab active:cursor-grabbing select-none"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <defs>
          <radialGradient id="mmBg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#mmBg)" />
        <g transform={`translate(${CX + pan.x}, ${CY + pan.y}) scale(${zoom})`}>
          <MindMapNode node={mindMap} x={0} y={0} depth={0} angle={0} spread={2 * Math.PI} />
        </g>
      </svg>
    </div>
  );
}

// ── Flashcard player ─────────────────────────────────────────────────────────
function FlashcardPlayer({ cards }: { cards: Flashcard[] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());

  const total = cards.length;
  const card = cards[idx];
  const knownCount = known.size;

  const next = () => { setFlipped(false); setTimeout(() => setIdx(i => (i + 1) % total), 150); };
  const prev = () => { setFlipped(false); setTimeout(() => setIdx(i => (i - 1 + total) % total), 150); };

  const markKnown = () => {
    setKnown(s => { const ns = new Set(s); if (ns.has(idx)) ns.delete(idx); else ns.add(idx); return ns; });
  };

  if (total === 0) return <p className="text-sm text-muted-foreground">Nenhum flashcard gerado.</p>;

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Cartão {idx + 1} de {total}</span>
          <span className="text-[color:var(--success)]">{knownCount} dominados</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((idx + 1) / total) * 100}%` }}
          />
        </div>
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <div key={i} className={cn(
              "h-1 flex-1 rounded-full transition-all",
              i === idx ? "bg-primary" : known.has(i) ? "bg-[color:var(--success)]/60" : "bg-border"
            )} />
          ))}
        </div>
      </div>

      {/* Card */}
      <div
        className="relative cursor-pointer"
        style={{ perspective: 1200 }}
        onClick={() => setFlipped(f => !f)}
      >
        <div
          className="relative transition-all duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: 220,
          }}
        >
          {/* Front */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl border-2 flex flex-col items-center justify-center p-8 text-center",
              "bg-gradient-to-br from-card to-background",
              known.has(idx) ? "border-[color:var(--success)]/40" : "border-primary/30",
              "backface-hidden"
            )}
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
              Pergunta · Clique para revelar
            </div>
            <p className="text-base font-semibold leading-relaxed max-w-lg">{card.front}</p>
            <div className="mt-6 flex gap-2 opacity-30">
              <div className="h-1 w-8 rounded bg-primary" />
              <div className="h-1 w-4 rounded bg-primary" />
              <div className="h-1 w-6 rounded bg-primary" />
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-[color:var(--success)]/40 bg-gradient-to-br from-[color:var(--success)]/5 to-background flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--success)] mb-4">
              Resposta
            </div>
            <p className="text-sm leading-relaxed max-w-lg text-foreground">{card.back}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={prev} className="h-10 w-10 rounded-xl">
          <ChevronLeft className="h-4.5 w-4.5" />
        </Button>

        <Button
          variant="ghost"
          onClick={markKnown}
          className={cn(
            "flex-1 h-10 rounded-xl text-sm font-medium gap-2 transition-all",
            known.has(idx)
              ? "bg-[color:var(--success)]/15 text-[color:var(--success)] border border-[color:var(--success)]/30"
              : "border border-border hover:border-[color:var(--success)]/40"
          )}
        >
          {known.has(idx) ? "✓ Dominado" : "Marcar como dominado"}
        </Button>

        <Button variant="ghost" size="icon" onClick={next} className="h-10 w-10 rounded-xl">
          <ChevronRight className="h-4.5 w-4.5" />
        </Button>
      </div>

      {knownCount === total && (
        <div className="rounded-xl border border-[color:var(--success)]/30 bg-[color:var(--success)]/8 p-4 text-center">
          <p className="text-sm font-semibold text-[color:var(--success)]">🎉 Você dominou todos os flashcards!</p>
          <Button size="sm" variant="ghost" onClick={() => { setKnown(new Set()); setIdx(0); setFlipped(false); }}
            className="mt-2 text-xs gap-1">
            <RotateCcw className="h-3 w-3" /> Reiniciar
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Summary renderer ──────────────────────────────────────────────────────────
function SummaryView({ summary }: { summary: string }) {
  // Renderiza markdown simples (##, **, -, *)
  const lines = summary.split("\n");
  return (
    <div className="prose-custom space-y-2 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return (
          <h3 key={i} className="text-base font-bold text-primary mt-5 mb-2 first:mt-0 flex items-center gap-2">
            <div className="h-0.5 w-3 bg-primary rounded" />
            {line.slice(3)}
          </h3>
        );
        if (line.startsWith("### ")) return (
          <h4 key={i} className="text-sm font-semibold text-foreground mt-3 mb-1">{line.slice(4)}</h4>
        );
        if (line.startsWith("- ") || line.startsWith("* ")) return (
          <div key={i} className="flex gap-2 items-start">
            <div className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        );
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
        );
      })}
    </div>
  );
}

// ── Upload dropzone ───────────────────────────────────────────────────────────
function UploadZone({
  onUpload,
}: {
  onUpload: (file: File, subject: string, title: string) => Promise<void>;
}) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "extracting" | "flashcards" | "summary" | "mindmap" | "saving">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const STAGES = {
    idle: "",
    extracting: "📄 Extraindo texto do PDF...",
    flashcards: "🃏 Gerando flashcards com IA...",
    summary: "📝 Criando resumo estruturado...",
    mindmap: "🧠 Montando mapa mental...",
    saving: "💾 Salvando no repositório...",
  };

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) { toast.error("Apenas arquivos PDF."); return; }
    setFile(f);
    if (!title) setTitle(f.name.replace(".pdf", ""));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const submit = async () => {
    if (!file || !subject.trim() || !title.trim()) {
      toast.error("Preencha a matéria, o título e selecione um PDF.");
      return;
    }
    setLoading(true);
    const stageOrder: typeof stage[] = ["extracting", "flashcards", "summary", "mindmap", "saving"];
    let si = 0;
    const interval = setInterval(() => {
      if (si < stageOrder.length) { setStage(stageOrder[si++]); }
      else clearInterval(interval);
    }, 8000);
    setStage("extracting");
    try {
      await onUpload(file, subject, title);
      clearInterval(interval);
      toast.success("Material criado com sucesso! 🎉");
      setFile(null); setSubject(""); setTitle(""); setStage("idle");
    } catch (e: any) {
      clearInterval(interval);
      toast.error(e.message || "Erro ao processar PDF.");
      setStage("idle");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-200",
          dragging
            ? "border-primary bg-primary/8 scale-[1.01]"
            : file
            ? "border-[color:var(--success)]/50 bg-[color:var(--success)]/5 cursor-default"
            : "border-border hover:border-primary/50 hover:bg-primary/4"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {file ? (
          <div className="space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--success)]/15 mx-auto">
              <FileText className="h-7 w-7 text-[color:var(--success)]" />
            </div>
            <div>
              <p className="font-semibold text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(""); }}
              className="text-xs text-muted-foreground hover:text-destructive gap-1 flex items-center mx-auto transition-colors"
            >
              <X className="h-3 w-3" /> Remover
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl mx-auto transition-all",
              dragging ? "bg-primary/20 scale-110" : "bg-primary/10"
            )}>
              <Upload className={cn("h-6 w-6 transition-all", dragging ? "text-primary scale-110" : "text-primary/70")} />
            </div>
            <div>
              <p className="font-semibold text-sm">{dragging ? "Solte o PDF aqui" : "Arraste um PDF ou clique para selecionar"}</p>
              <p className="text-xs text-muted-foreground mt-1">Máximo 20 MB · Somente PDF</p>
            </div>
          </div>
        )}
      </div>

      {/* Form fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Matéria</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: Direito Constitucional"
            className="bg-card h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Título do material</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Princípios Fundamentais"
            className="bg-card h-11"
          />
        </div>
      </div>

      {/* Submit button */}
      <Button
        onClick={submit}
        disabled={loading || !file || !subject.trim() || !title.trim()}
        className="w-full h-12 text-base font-semibold gap-2.5"
        size="lg"
      >
        {loading ? (
          <>
            <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
            <span>{STAGES[stage] || "Processando..."}</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4.5 w-4.5" />
            Gerar flashcards, resumo e mapa mental
          </>
        )}
      </Button>

      {/* Loading stages indicator */}
      {loading && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="space-y-2">
            {(["extracting", "flashcards", "summary", "mindmap", "saving"] as const).map((s, i) => {
              const stageOrder = ["extracting", "flashcards", "summary", "mindmap", "saving"];
              const currentIdx = stageOrder.indexOf(stage);
              const thisIdx = i;
              const isDone = thisIdx < currentIdx;
              const isCurrent = thisIdx === currentIdx;
              return (
                <div key={s} className={cn("flex items-center gap-2.5 text-xs transition-all", isCurrent ? "opacity-100" : isDone ? "opacity-50" : "opacity-25")}>
                  <div className={cn("h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                    isDone ? "border-[color:var(--success)] bg-[color:var(--success)]/15" :
                    isCurrent ? "border-primary bg-primary/15" : "border-border")}>
                    {isDone ? <span className="text-[color:var(--success)] text-[10px]">✓</span> :
                     isCurrent ? <div className="h-2 w-2 rounded-full bg-primary animate-pulse" /> :
                     <div className="h-1.5 w-1.5 rounded-full bg-border" />}
                  </div>
                  <span className={isCurrent ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {STAGES[s].slice(3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Material detail view ──────────────────────────────────────────────────────
function MaterialDetail({
  material,
  onBack,
  onDelete,
}: {
  material: StudyMaterial;
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("flashcards");

  const TABS: { key: DetailTab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "flashcards", label: "Flashcards", icon: Layers, count: material.flashcards?.length },
    { key: "resumo", label: "Resumo", icon: BookOpen },
    { key: "mapa", label: "Mapa Mental", icon: GitBranch },
  ];

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">{material.subject}</span>
            {material.page_count && (
              <span className="text-[10px] text-muted-foreground">{material.page_count} pág.</span>
            )}
          </div>
          <h2 className="text-xl font-bold truncate">{material.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{material.source_name}</p>
        </div>
        <button
          onClick={() => { if (confirm("Excluir este material?")) onDelete(material.id); }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-border bg-muted/30 p-1 gap-1">
        {TABS.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
              tab === key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            {count !== undefined && (
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                tab === key ? "bg-primary/15 text-primary" : "bg-border text-muted-foreground")}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-border bg-card p-6 card-glow min-h-[400px]">
        {tab === "flashcards" && (
          <FlashcardPlayer cards={material.flashcards ?? []} />
        )}
        {tab === "resumo" && (
          material.summary
            ? <SummaryView summary={material.summary} />
            : <p className="text-sm text-muted-foreground">Resumo não disponível.</p>
        )}
        {tab === "mapa" && (
          material.mind_map?.label
            ? <MindMapView mindMap={material.mind_map} />
            : <p className="text-sm text-muted-foreground">Mapa mental não disponível.</p>
        )}
      </div>
    </div>
  );
}

// ── Repository card ────────────────────────────────────────────────────────────
function MaterialCard({
  material,
  onClick,
}: {
  material: StudyMaterial;
  onClick: () => void;
}) {
  const fcCount = material.flashcards?.length ?? 0;
  const hasResume = !!material.summary;
  const hasMM = !!material.mind_map?.label;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 card-glow"
    >
      {/* Subject badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          {material.subject}
        </span>
        {material.page_count && (
          <span className="text-[10px] text-muted-foreground shrink-0">{material.page_count}p</span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {material.title}
      </h3>

      {/* Preview */}
      {material.text_preview && (
        <p className="mt-2 text-[11px] text-muted-foreground/70 line-clamp-2 leading-relaxed">
          {material.text_preview}
        </p>
      )}

      {/* Pills */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
          fcCount > 0 ? "border-primary/30 bg-primary/8 text-primary" : "border-border text-muted-foreground/50")}>
          <Layers className="h-2.5 w-2.5" />
          {fcCount} flashcards
        </span>
        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
          hasResume ? "border-[color:var(--success)]/30 bg-[color:var(--success)]/8 text-[color:var(--success)]" : "border-border text-muted-foreground/50")}>
          <BookOpen className="h-2.5 w-2.5" />
          {hasResume ? "Resumo" : "Sem resumo"}
        </span>
        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
          hasMM ? "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/8 text-[color:var(--warning)]" : "border-border text-muted-foreground/50")}>
          <GitBranch className="h-2.5 w-2.5" />
          {hasMM ? "Mapa" : "Sem mapa"}
        </span>
      </div>

      {/* Date */}
      <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground/50">
        <Clock className="h-3 w-3" />
        {new Date(material.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
      </div>
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
function MateriaisPage() {
  const [view, setView] = useState<View>("repo");
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StudyMaterial | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mats, subs] = await Promise.all([api.materials.list(), api.materials.listSubjects()]);
      setMaterials(mats);
      setSubjects(subs);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (file: File, subject: string, title: string) => {
    await api.materials.upload(file, subject, title);
    await load();
    setView("repo");
  };

  const handleDelete = async (id: string) => {
    await api.materials.delete(id);
    setSelected(null);
    setView("repo");
    await load();
    toast.success("Material excluído.");
  };

  const openDetail = (m: StudyMaterial) => {
    setSelected(m);
    setView("detail");
  };

  // Filtered list
  const filtered = materials.filter(m => {
    const matchSubject = !selectedSubject || m.subject === selectedSubject;
    const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.subject.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="fade-up flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Materiais de Estudo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envie PDFs e a IA gera flashcards, resumos e mapas mentais automaticamente.
          </p>
        </div>
        {view !== "upload" && view !== "detail" && (
          <Button onClick={() => setView("upload")} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo material</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        )}
      </div>

      {/* Detail view */}
      {view === "detail" && selected && (
        <MaterialDetail
          material={selected}
          onBack={() => { setView("repo"); setSelected(null); }}
          onDelete={handleDelete}
        />
      )}

      {/* Upload view */}
      {view === "upload" && (
        <div className="space-y-5 fade-up">
          <button
            onClick={() => setView("repo")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar ao repositório
          </button>

          <div className="rounded-2xl border border-border bg-card p-6 card-glow">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold">Processar PDF com IA</h2>
                <p className="text-xs text-muted-foreground">Extração automática de flashcards, resumo e mapa mental</p>
              </div>
            </div>
            <UploadZone onUpload={handleUpload} />
          </div>

          {/* What will be generated */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Layers, label: "12 Flashcards", desc: "Perguntas e respostas dos conceitos principais", color: "text-primary bg-primary/10" },
              { icon: BookOpen, label: "Resumo estruturado", desc: "Com seções, bullet points e destaques", color: "text-[color:var(--success)] bg-[color:var(--success)]/10" },
              { icon: GitBranch, label: "Mapa mental", desc: "Hierarquia visual interativa do conteúdo", color: "text-[color:var(--warning)] bg-[color:var(--warning)]/10" },
            ].map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className="rounded-xl border border-border bg-card/50 p-4">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg mb-3", color.split(" ")[1])}>
                  <Icon className={cn("h-4 w-4", color.split(" ")[0])} />
                </div>
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repository view */}
      {view === "repo" && (
        <div className="space-y-5 fade-up fade-up-1">
          {/* Filters */}
          {(subjects.length > 0 || materials.length > 0) && (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título ou matéria..."
                  className="pl-9 bg-card h-11"
                />
              </div>

              {/* Subject filters */}
              {subjects.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedSubject(null)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                      !selectedSubject ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    Todas as matérias
                  </button>
                  {subjects.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSubject(s === selectedSubject ? null : s)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                        selectedSubject === s ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Count */}
          {materials.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "material" : "materiais"}
              {selectedSubject ? ` em ${selectedSubject}` : ""}
              {search ? ` para "${search}"` : ""}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-52 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m, i) => (
                <div key={m.id} className="fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
                  <MaterialCard material={m} onClick={() => openDetail(m)} />
                </div>
              ))}
            </div>
          ) : materials.length === 0 ? (
            /* Empty state */
            <div className="rounded-2xl border-2 border-dashed border-border py-20 text-center fade-up fade-up-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-5">
                <FileText className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="text-base font-semibold mb-2">Nenhum material ainda</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                Envie um PDF e a IA irá gerar flashcards, resumo e mapa mental automaticamente.
              </p>
              <Button onClick={() => setView("upload")} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Enviar primeiro PDF
              </Button>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum material encontrado para a busca atual.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
