import { useState } from "react";
import { useListStudents, getListStudentsQueryKey, useCreateStudent, useUpdateStudent, useDeleteStudent } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Plus, Edit2, Trash2, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const studentSchema = z.object({
  name: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır"),
  className: z.string().min(1, "Sınıf seçiniz"),
  birthDate: z.string().min(1, "Doğum tarihi seçiniz"),
  height: z.coerce.number().min(100, "Boy en az 100 cm olmalıdır").max(250, "Boy en fazla 250 cm olmalıdır"),
  weight: z.coerce.number().min(20, "Kilo en az 20 kg olmalıdır").max(200, "Kilo en fazla 200 kg olmalıdır"),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function Students() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  
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
      height: 150,
      weight: 50,
    },
  });

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
    setIsAddOpen(true);
  };

  const closeForm = () => {
    setIsAddOpen(false);
    setEditingStudentId(null);
    form.reset({
      name: "",
      className: "",
      birthDate: "",
      height: 150,
      weight: 50,
    });
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
          <DialogContent className="sm:max-w-[425px]">
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeForm}>İptal</Button>
                  <Button type="submit" disabled={createStudent.isPending || updateStudent.isPending}>
                    {createStudent.isPending || updateStudent.isPending ? "Kaydediliyor..." : "Kaydet"}
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
