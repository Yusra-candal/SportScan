import { useState, useRef, useCallback } from "react";
import { useListStudents, getListStudentsQueryKey, useCreateStudent, useUpdateStudent, useDeleteStudent } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Plus, Edit2, Trash2, ChevronRight, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const studentSchema = z.object({
  name: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır"),
  className: z.string().min(1, "Sınıf seçiniz"),
  birthDate: z.string().min(1, "Doğum tarihi seçiniz"),
  height: z.coerce.number().min(100, "Boy en az 100 cm olmalıdır").max(250, "Boy en fazla 250 cm olmalıdır"),
  weight: z.coerce.number().min(20, "Kilo en az 20 kg olmalıdır").max(200, "Kilo en fazla 200 kg olmalıdır"),
});

type StudentFormValues = z.infer<typeof studentSchema>;

type UploadState =
  | { status: "idle" }
  | { status: "analyzing"; fileName: string }
  | { status: "done"; resultCm: number; fileName: string }
  | { status: "error"; message: string; fileName: string };

interface VideoUploadZoneProps {
  inputId: string;
  label: string;
  hint: string;
  heightCm: number;
  state: UploadState;
  onStateChange: (s: UploadState) => void;
}

function VideoUploadZone({ inputId, label, hint, heightCm, state, onStateChange }: VideoUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const analyze = useCallback(async (file: File) => {
    onStateChange({ status: "analyzing", fileName: file.name });

    const formData = new FormData();
    formData.append("video", file);
    if (heightCm >= 100 && heightCm <= 250) {
      formData.append("height_cm", String(heightCm));
    }

    try {
      const res = await fetch("/api/jump-analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `Sunucu hatası: ${res.status}`);
      const resultCm = Math.round(data.jumpHeightCm ?? 0);
      onStateChange({ status: "done", resultCm, fileName: file.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      onStateChange({ status: "error", message, fileName: file.name });
    }
  }, [heightCm, onStateChange]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      analyze(file);
      e.target.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) analyze(file);
  }

  const isAnalyzing = state.status === "analyzing";

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium leading-none">
        {label} <span className="text-muted-foreground font-normal">(opsiyonel)</span>
      </p>
      <label
        htmlFor={inputId}
        className={cn(
          "block border-2 border-dashed rounded-lg p-3 transition-colors",
          !isAnalyzing ? "cursor-pointer" : "cursor-default pointer-events-none",
          isDragOver
            ? "border-primary bg-primary/5"
            : state.status === "done"
            ? "border-green-500 bg-green-50 dark:bg-green-950/20"
            : state.status === "error"
            ? "border-destructive bg-destructive/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={handleChange}
          disabled={isAnalyzing}
        />

        {state.status === "idle" && (
          <div className="flex items-center gap-3 py-1">
            <Upload className="h-6 w-6 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Video yüklemek için tıklayın</p>
              <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
            </div>
          </div>
        )}

        {state.status === "analyzing" && (
          <div className="flex items-center gap-3 py-1">
            <Loader2 className="h-6 w-6 text-primary animate-spin shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Analiz ediliyor...</p>
              <p className="text-xs text-muted-foreground truncate">{state.fileName}</p>
            </div>
          </div>
        )}

        {state.status === "done" && (
          <div className="flex items-center gap-3 py-1">
            <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                Sonuç: <span className="text-lg font-bold">{state.resultCm} cm</span>
              </p>
              <p className="text-xs text-muted-foreground">Farklı video için tıklayın</p>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex items-center gap-3 py-1">
            <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-destructive">Analiz başarısız</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{state.message}</p>
              <p className="text-xs text-primary mt-0.5">Tekrar denemek için tıklayın</p>
            </div>
          </div>
        )}
      </label>
    </div>
  );
}

const idleState: UploadState = { status: "idle" };

export default function Students() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);

  const [ziplama, setZiplama] = useState<UploadState>(idleState);
  const [esneklik, setEsneklik] = useState<UploadState>(idleState);
  const [kosu, setKosu] = useState<UploadState>(idleState);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: students, isLoading } = useListStudents(
    {
      search: search || undefined,
      classFilter: classFilter !== "all" ? classFilter : undefined
    },
    {
      query: {
        queryKey: getListStudentsQueryKey({ search: search || undefined, classFilter: classFilter !== "all" ? classFilter : undefined })
      }
    }
  );

  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      className: "",
      birthDate: "",
      height: 170,
      weight: 65,
    },
  });

  const heightValue = form.watch("height");

  const isAnyAnalyzing =
    ziplama.status === "analyzing" ||
    esneklik.status === "analyzing" ||
    kosu.status === "analyzing";

  const onSubmit = (data: StudentFormValues) => {
    if (editingStudentId) {
      updateStudent.mutate(
        { id: editingStudentId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
            toast({ title: "Başarılı", description: "Öğrenci bilgileri güncellendi." });
            closeForm();
          },
          onError: () => toast({ variant: "destructive", title: "Hata", description: "Güncelleme başarısız oldu." })
        }
      );
    } else {
      createStudent.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
            toast({ title: "Başarılı", description: "Yeni öğrenci eklendi." });
            closeForm();
          },
          onError: () => toast({ variant: "destructive", title: "Hata", description: "Ekleme başarısız oldu." })
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteStudent.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
          toast({ title: "Başarılı", description: "Öğrenci silindi." });
        },
        onError: () => toast({ variant: "destructive", title: "Hata", description: "Silme işlemi başarısız oldu." })
      }
    );
  };

  const openEditForm = (student: any) => {
    setEditingStudentId(student.id);
    form.reset({
      name: student.name,
      className: student.className,
      birthDate: student.birthDate,
      height: student.height,
      weight: student.weight,
    });
    setZiplama(idleState);
    setEsneklik(idleState);
    setKosu(idleState);
    setIsAddOpen(true);
  };

  const closeForm = () => {
    setIsAddOpen(false);
    setEditingStudentId(null);
    setZiplama(idleState);
    setEsneklik(idleState);
    setKosu(idleState);
    form.reset({ name: "", className: "", birthDate: "", height: 170, weight: 65 });
  };

  const classOptions = ["9-A", "9-B", "10-A", "10-B", "11-A", "11-B", "12-A", "12-B"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Öğrenci Yönetimi</h1>
          <p className="text-muted-foreground mt-1">Öğrenci listesi, düzenleme ve yeni kayıt işlemleri.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => !open ? closeForm() : setIsAddOpen(true)}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Yeni Öğrenci</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStudentId ? "Öğrenci Düzenle" : "Yeni Öğrenci Ekle"}</DialogTitle>
              <DialogDescription>
                Öğrenci bilgilerini eksiksiz doldurunuz.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ad Soyad</FormLabel>
                      <FormControl>
                        <Input placeholder="Ali Yılmaz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="className"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sınıf</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doğum Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Boy (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kilo (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {!editingStudentId && (
                  <div className="space-y-3 pt-2 border-t">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-1">
                      Video Testleri (Opsiyonel)
                    </p>
                    <VideoUploadZone
                      inputId="video-ziplama"
                      label="Zıplama Testi"
                      hint="Yan profil · 3× maksimum sıçrama"
                      heightCm={Number(heightValue)}
                      state={ziplama}
                      onStateChange={setZiplama}
                    />
                    <VideoUploadZone
                      inputId="video-esneklik"
                      label="Esneklik Testi"
                      hint="Öne eğilme · tam hareket açısı"
                      heightCm={Number(heightValue)}
                      state={esneklik}
                      onStateChange={setEsneklik}
                    />
                    <VideoUploadZone
                      inputId="video-kosu"
                      label="Koşu Testi"
                      hint="20m sprint · yan profil kamera"
                      heightCm={Number(heightValue)}
                      state={kosu}
                      onStateChange={setKosu}
                    />
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeForm}>İptal</Button>
                  <Button
                    type="submit"
                    disabled={createStudent.isPending || updateStudent.isPending || isAnyAnalyzing}
                  >
                    {createStudent.isPending || updateStudent.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Kaydediliyor...</>
                    ) : "Kaydet"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Öğrenci ara..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tüm Sınıflar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Sınıflar</SelectItem>
                {classOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Sınıf</TableHead>
                  <TableHead className="hidden md:table-cell">Doğum Tarihi</TableHead>
                  <TableHead className="hidden sm:table-cell">Boy/Kilo</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : students && students.length > 0 ? (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.className}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(student.birthDate).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {student.height}cm / {student.weight}kg
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Link href={`/ogrenciler/${student.id}`}>
                          <Button variant="ghost" size="icon" title="Karneye Git">
                            <ChevronRight className="h-4 w-4 text-primary" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => openEditForm(student)} title="Düzenle">
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
                                {student.name} isimli öğrencinin tüm kayıtları ve performans verileri silinecektir. Bu işlem geri alınamaz.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>İptal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(student.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Sil
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Kayıtlı öğrenci bulunamadı.
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
