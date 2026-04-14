import { useState } from "react";
import { useListStudents, getListStudentsQueryKey, useCreateMetric, useListMetrics, getListMetricsQueryKey, useUpdateMetric, useDeleteMetric } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Edit2, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const metricSchema = z.object({
  studentId: z.coerce.number().min(1, "Öğrenci seçiniz"),
  sport: z.enum(["voleybol", "basketbol", "futbol"], { required_error: "Branş seçiniz" }),
  speed: z.number().min(1).max(10),
  endurance: z.number().min(1).max(10),
  strength: z.number().min(1).max(10),
  agility: z.number().min(1).max(10),
  technique: z.number().min(1).max(10),
  teamwork: z.number().min(1).max(10),
  evaluationDate: z.string().min(1, "Tarih seçiniz"),
  notes: z.string().optional().nullable(),
});

type MetricFormValues = z.infer<typeof metricSchema>;

export default function Performance() {
  const [searchParams] = useState(new URLSearchParams(window.location.search));
  const prefillStudentId = searchParams.get('studentId');
  const [, setLocation] = useLocation();
  const [editingMetricId, setEditingMetricId] = useState<number | null>(null);

  const { data: students, isLoading: isLoadingStudents } = useListStudents({}, { query: { queryKey: getListStudentsQueryKey({}) }});
  
  // Only load recent metrics for the table
  const { data: recentMetrics, isLoading: isLoadingMetrics } = useListMetrics({}, { query: { queryKey: getListMetricsQueryKey({}) }});

  const createMetric = useCreateMetric();
  const updateMetric = useUpdateMetric();
  const deleteMetric = useDeleteMetric();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MetricFormValues>({
    resolver: zodResolver(metricSchema),
    defaultValues: {
      studentId: prefillStudentId ? parseInt(prefillStudentId) : 0,
      sport: undefined,
      speed: 5,
      endurance: 5,
      strength: 5,
      agility: 5,
      technique: 5,
      teamwork: 5,
      evaluationDate: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  const onSubmit = (data: MetricFormValues) => {
    if (editingMetricId) {
      updateMetric.mutate(
        { id: editingMetricId, data: { ...data, notes: data.notes || undefined } },
        {
          onSuccess: () => {
            toast({ title: "Başarılı", description: "Değerlendirme güncellendi." });
            queryClient.invalidateQueries({ queryKey: getListMetricsQueryKey() });
            setEditingMetricId(null);
            form.reset();
          },
          onError: () => toast({ variant: "destructive", title: "Hata", description: "Güncelleme başarısız oldu." })
        }
      );
    } else {
      createMetric.mutate(
        { data: { ...data, notes: data.notes || undefined } },
        {
          onSuccess: () => {
            toast({ title: "Başarılı", description: "Değerlendirme kaydedildi." });
            queryClient.invalidateQueries({ queryKey: getListMetricsQueryKey() });
            setLocation(`/ogrenciler/${data.studentId}`);
          },
          onError: () => toast({ variant: "destructive", title: "Hata", description: "Kayıt başarısız oldu." })
        }
      );
    }
  };

  const handleEdit = (metric: any) => {
    setEditingMetricId(metric.id);
    form.reset({
      studentId: metric.studentId,
      sport: metric.sport,
      speed: metric.speed,
      endurance: metric.endurance,
      strength: metric.strength,
      agility: metric.agility,
      technique: metric.technique,
      teamwork: metric.teamwork,
      evaluationDate: metric.evaluationDate.split('T')[0],
      notes: metric.notes || "",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: number) => {
    deleteMetric.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Başarılı", description: "Değerlendirme silindi." });
          queryClient.invalidateQueries({ queryKey: getListMetricsQueryKey() });
        },
        onError: () => toast({ variant: "destructive", title: "Hata", description: "Silme işlemi başarısız oldu." })
      }
    );
  };

  const cancelEdit = () => {
    setEditingMetricId(null);
    form.reset({
      studentId: prefillStudentId ? parseInt(prefillStudentId) : 0,
      sport: undefined,
      speed: 5,
      endurance: 5,
      strength: 5,
      agility: 5,
      technique: 5,
      teamwork: 5,
      evaluationDate: new Date().toISOString().split('T')[0],
      notes: "",
    });
  };

  const ScoreSlider = ({ field, label }: { field: any, label: string }) => (
    <FormItem className="space-y-4">
      <div className="flex justify-between items-center">
        <FormLabel className="text-base">{label}</FormLabel>
        <div className="w-12 text-center font-bold text-lg text-primary">{field.value}</div>
      </div>
      <FormControl>
        <Slider
          min={1}
          max={10}
          step={1}
          value={[field.value]}
          onValueChange={(vals) => field.onChange(vals[0])}
          className="py-4"
        />
      </FormControl>
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>Geliştirilmeli (1)</span>
        <span>Mükemmel (10)</span>
      </div>
      <FormMessage />
    </FormItem>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performans Değerlendirme</h1>
        <p className="text-muted-foreground mt-1">Öğrenci becerilerini değerlendirin ve yönetin.</p>
      </div>

      <Card className={editingMetricId ? "border-primary shadow-md ring-1 ring-primary" : ""}>
        <CardHeader>
          <CardTitle>{editingMetricId ? "Değerlendirmeyi Düzenle" : "Yeni Değerlendirme Formu"}</CardTitle>
          <CardDescription>
            Tüm kriterleri 1-10 arası bir ölçekle değerlendirin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border">
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Öğrenci</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(parseInt(val))} 
                        value={field.value ? field.value.toString() : ""}
                        disabled={isLoadingStudents || editingMetricId !== null}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Öğrenci seçiniz" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students?.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.name} ({s.className})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branş</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={editingMetricId !== null}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Branş seçiniz" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="voleybol">Voleybol</SelectItem>
                          <SelectItem value="basketbol">Basketbol</SelectItem>
                          <SelectItem value="futbol">Futbol</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="evaluationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Değerlendirme Tarihi</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Kriterler</h3>
                <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 py-4">
                  <FormField control={form.control} name="speed" render={({ field }) => <ScoreSlider field={field} label="Hız" />} />
                  <FormField control={form.control} name="endurance" render={({ field }) => <ScoreSlider field={field} label="Dayanıklılık" />} />
                  <FormField control={form.control} name="strength" render={({ field }) => <ScoreSlider field={field} label="Güç" />} />
                  <FormField control={form.control} name="agility" render={({ field }) => <ScoreSlider field={field} label="Çeviklik" />} />
                  <FormField control={form.control} name="technique" render={({ field }) => <ScoreSlider field={field} label="Teknik" />} />
                  <FormField control={form.control} name="teamwork" render={({ field }) => <ScoreSlider field={field} label="Takım Oyunu" />} />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eğitmen Notları (Opsiyonel)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Öğrencinin gelişimi hakkında eklemek istedikleriniz..." 
                          className="resize-none" 
                          rows={3}
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-6">
                {editingMetricId && (
                  <Button type="button" variant="outline" size="lg" onClick={cancelEdit}>
                    İptal
                  </Button>
                )}
                <Button type="submit" size="lg" disabled={createMetric.isPending || updateMetric.isPending}>
                  {createMetric.isPending || updateMetric.isPending ? "Kaydediliyor..." : (editingMetricId ? "Güncelle" : "Değerlendirmeyi Kaydet")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Son Değerlendirmeler</CardTitle>
          <CardDescription>
            Sistemdeki en son performans kayıtları.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Öğrenci</TableHead>
                  <TableHead>Branş</TableHead>
                  <TableHead className="text-center">Ortalama</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingMetrics || isLoadingStudents ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : recentMetrics && recentMetrics.length > 0 ? (
                  // Sort by newest first
                  recentMetrics.sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime()).slice(0, 10).map((metric) => {
                    const student = students?.find(s => s.id === metric.studentId);
                    return (
                      <TableRow key={metric.id}>
                        <TableCell>
                          {new Date(metric.evaluationDate).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {student?.name || `Öğrenci #${metric.studentId}`}
                        </TableCell>
                        <TableCell className="capitalize">{metric.sport}</TableCell>
                        <TableCell className="text-center font-bold text-primary">
                          {metric.overallScore.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(metric)} title="Düzenle">
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Sil">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu değerlendirme kalıcı olarak silinecektir.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(metric.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Sil
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Kayıtlı değerlendirme bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
