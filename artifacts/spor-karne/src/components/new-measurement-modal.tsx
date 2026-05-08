import { useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  useUpdateStudent,
  useCreateMetric,
  getGetStudentReportCardQueryKey,
  getGetStudentQueryKey,
} from "@workspace/api-client-react";
import type { Student } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type VideoState =
  | { status: "idle" }
  | { status: "analyzing" }
  | { status: "done"; label: string }
  | { status: "error"; message: string };

interface VideoZoneProps {
  id: string;
  hint: string;
  state: VideoState;
  onFile: (file: File) => void;
}

function VideoZone({ id, hint, state, onFile }: VideoZoneProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { onFile(file); e.target.value = ""; }
  }
  const analyzing = state.status === "analyzing";
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-center gap-3 p-3 border-2 border-dashed rounded-lg transition-colors",
        analyzing ? "cursor-default pointer-events-none" : "cursor-pointer",
        state.status === "idle" && "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40",
        state.status === "analyzing" && "border-muted-foreground/25",
        state.status === "done" && "border-green-500 bg-green-50 dark:bg-green-950/20",
        state.status === "error" && "border-destructive bg-destructive/5",
      )}
    >
      <input id={id} type="file" accept="video/*" className="sr-only" onChange={handleChange} disabled={analyzing} />
      {state.status === "idle" && (
        <><Upload className="h-4 w-4 text-muted-foreground shrink-0" /><span className="text-xs text-muted-foreground">{hint}</span></>
      )}
      {state.status === "analyzing" && (
        <><Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" /><span className="text-xs">Analiz ediliyor…</span></>
      )}
      {state.status === "done" && (
        <><CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /><span className="text-xs font-medium text-green-700 dark:text-green-400">{state.label}</span></>
      )}
      {state.status === "error" && (
        <><AlertCircle className="h-4 w-4 text-destructive shrink-0" /><span className="text-xs text-destructive line-clamp-1">{state.message} — tekrar denemek için tıklayın</span></>
      )}
    </label>
  );
}

function clamp(n: number) { return Math.min(10, Math.max(1, Math.round(n))); }

interface Props {
  open: boolean;
  onClose: () => void;
  student: Student;
}

export function NewMeasurementModal({ open, onClose, student }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateStudentMutation = useUpdateStudent();
  const createMetricMutation = useCreateMetric();

  const today = new Date().toISOString().split("T")[0];

  const [sport, setSport] = useState<"voleybol" | "basketbol" | "futbol">("voleybol");
  const [height, setHeight] = useState(String(student.height));
  const [weight, setWeight] = useState(String(student.weight));
  const [evalDate, setEvalDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [runDistance, setRunDistance] = useState("20");

  const [speed, setSpeed] = useState(5);
  const [endurance, setEndurance] = useState(5);
  const [strength, setStrength] = useState(5);
  const [agility, setAgility] = useState(5);
  const [technique, setTechnique] = useState(5);
  const [teamwork, setTeamwork] = useState(5);

  const [jumpState, setJumpState] = useState<VideoState>({ status: "idle" });
  const [flexState, setFlexState] = useState<VideoState>({ status: "idle" });
  const [runState, setRunState] = useState<VideoState>({ status: "idle" });

  const handleJumpVideo = useCallback(async (file: File) => {
    setJumpState({ status: "analyzing" });
    const fd = new FormData();
    fd.append("video", file);
    const h = parseFloat(height);
    if (h >= 100) fd.append("height_cm", String(h));
    try {
      const res = await fetch("/video-api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Sunucu hatası");
      const cm = Math.round(data.jumpHeightCm ?? 0);
      const score = clamp(cm / 6);
      setStrength(score);
      setJumpState({ status: "done", label: `${cm} cm → Güç: ${score}/10` });
    } catch (e) {
      setJumpState({ status: "error", message: e instanceof Error ? e.message : "Bilinmeyen hata" });
    }
  }, [height]);

  const handleFlexVideo = useCallback(async (file: File) => {
    setFlexState({ status: "analyzing" });
    const fd = new FormData();
    fd.append("video", file);
    try {
      const res = await fetch("/flex-api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Sunucu hatası");
      const deg = data.flexAngleDeg ?? 0;
      const score = clamp(deg / 9);
      setTechnique(score);
      setFlexState({ status: "done", label: `${deg}° → Esneklik: ${score}/10` });
    } catch (e) {
      setFlexState({ status: "error", message: e instanceof Error ? e.message : "Bilinmeyen hata" });
    }
  }, []);

  const handleRunVideo = useCallback(async (file: File) => {
    setRunState({ status: "analyzing" });
    const fd = new FormData();
    fd.append("video", file);
    fd.append("distance_meters", runDistance || "20");
    try {
      const res = await fetch("/run-api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Sunucu hatası");
      const ms = data.speedMs ?? 0;
      const score = clamp(ms / 0.8);
      setSpeed(score);
      setRunState({ status: "done", label: `${ms} m/s → Hız: ${score}/10` });
    } catch (e) {
      setRunState({ status: "error", message: e instanceof Error ? e.message : "Bilinmeyen hata" });
    }
  }, [runDistance]);

  const isAnalyzing =
    jumpState.status === "analyzing" ||
    flexState.status === "analyzing" ||
    runState.status === "analyzing";
  const isSaving = updateStudentMutation.isPending || createMetricMutation.isPending;

  function resetForm() {
    setSport("voleybol");
    setHeight(String(student.height));
    setWeight(String(student.weight));
    setEvalDate(today);
    setNotes("");
    setRunDistance("20");
    setSpeed(5); setEndurance(5); setStrength(5);
    setAgility(5); setTechnique(5); setTeamwork(5);
    setJumpState({ status: "idle" });
    setFlexState({ status: "idle" });
    setRunState({ status: "idle" });
  }

  function handleClose() {
    if (isAnalyzing || isSaving) return;
    onClose();
    resetForm();
  }

  async function handleSave() {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (isNaN(h) || h < 100 || h > 250) {
      toast({ variant: "destructive", title: "Hata", description: "Boy 100–250 cm arasında olmalıdır." });
      return;
    }
    if (isNaN(w) || w < 20 || w > 200) {
      toast({ variant: "destructive", title: "Hata", description: "Kilo 20–200 kg arasında olmalıdır." });
      return;
    }

    try {
      if (h !== student.height || w !== student.weight) {
        await updateStudentMutation.mutateAsync({ id: student.id, data: { height: h, weight: w } });
      }

      await createMetricMutation.mutateAsync({
        data: {
          studentId: student.id,
          sport,
          speed,
          endurance,
          strength,
          agility,
          technique,
          teamwork,
          evaluationDate: evalDate,
          notes: notes.trim() || null,
        },
      });

      queryClient.invalidateQueries({ queryKey: getGetStudentReportCardQueryKey(student.id) });
      queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(student.id) });
      toast({ title: "Başarılı", description: "Yeni ölçüm kaydedildi." });
      onClose();
      resetForm();
    } catch {
      toast({ variant: "destructive", title: "Hata", description: "Kayıt başarısız. Lütfen tekrar deneyin." });
    }
  }

  const metrics = [
    { label: "Hız",         value: speed,      set: setSpeed },
    { label: "Dayanıklılık", value: endurance,  set: setEndurance },
    { label: "Güç",          value: strength,   set: setStrength },
    { label: "Koordinasyon", value: agility,    set: setAgility },
    { label: "Esneklik",     value: technique,  set: setTechnique },
    { label: "Takım Oyunu",  value: teamwork,   set: setTeamwork },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Ölçüm Ekle</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Sport + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Branş</Label>
              <Select value={sport} onValueChange={(v) => setSport(v as "voleybol" | "basketbol" | "futbol")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="voleybol">Voleybol</SelectItem>
                  <SelectItem value="basketbol">Basketbol</SelectItem>
                  <SelectItem value="futbol">Futbol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tarih</Label>
              <Input type="date" value={evalDate} onChange={e => setEvalDate(e.target.value)} />
            </div>
          </div>

          {/* Height + Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Boy (cm)</Label>
              <Input type="number" min={100} max={250} value={height}
                onChange={e => setHeight(e.target.value)} placeholder={String(student.height)} />
            </div>
            <div className="space-y-1.5">
              <Label>Kilo (kg)</Label>
              <Input type="number" min={20} max={200} value={weight}
                onChange={e => setWeight(e.target.value)} placeholder={String(student.weight)} />
            </div>
          </div>

          <Separator />

          {/* Video Uploads */}
          <div>
            <p className="text-sm font-semibold mb-0.5">Video Analizleri</p>
            <p className="text-xs text-muted-foreground mb-3">
              Opsiyonel — yüklenen videolar ilgili metrikleri otomatik günceller.
            </p>
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">🦘 Sıçrama → Güç</p>
                <VideoZone id="modal-jump" hint="Video yükle" state={jumpState} onFile={handleJumpVideo} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">🤸 Esneklik → Esneklik Skoru</p>
                <VideoZone id="modal-flex" hint="Video yükle" state={flexState} onFile={handleFlexVideo} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">🏃 Koşu → Hız</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Mesafe:</span>
                    <Input type="number" min={1} max={400} value={runDistance}
                      onChange={e => setRunDistance(e.target.value)}
                      className="w-16 h-7 text-xs text-center px-2" />
                    <span className="text-xs text-muted-foreground">m</span>
                  </div>
                </div>
                <VideoZone id="modal-run" hint="Video yükle" state={runState} onFile={handleRunVideo} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Metric Sliders */}
          <div>
            <p className="text-sm font-semibold mb-3">Performans Metrikleri</p>
            <div className="space-y-4">
              {metrics.map(({ label, value, set }) => (
                <div key={label} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm">{label}</Label>
                    <span className="text-sm font-bold tabular-nums">
                      {value}<span className="text-muted-foreground font-normal text-xs">/10</span>
                    </span>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([v]) => set(v)}
                    min={1} max={10} step={1}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>
              Notlar <span className="text-muted-foreground font-normal text-xs">(opsiyonel)</span>
            </Label>
            <Textarea
              placeholder="Değerlendirme notları…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving || isAnalyzing}>
            İptal
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isAnalyzing}>
            {isSaving
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Kaydediliyor…</>
              : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
