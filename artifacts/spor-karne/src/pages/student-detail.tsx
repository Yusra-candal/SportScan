import { useState } from "react";
import { useParams } from "wouter";
import { useGetStudentReportCard, getGetStudentReportCardQueryKey, useGetStudent, getGetStudentQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { ChevronLeft, Calendar, Ruler, Weight, User, Activity, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NewMeasurementModal } from "@/components/new-measurement-modal";

export default function StudentDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [measurementOpen, setMeasurementOpen] = useState(false);

  const { data: student, isLoading: isLoadingStudent } = useGetStudent(id, {
    query: { enabled: !!id, queryKey: getGetStudentQueryKey(id) }
  });

  const { data: reportCard, isLoading: isLoadingReport } = useGetStudentReportCard(id, {
    query: { enabled: !!id, queryKey: getGetStudentReportCardQueryKey(id) }
  });

  if (isLoadingStudent || isLoadingReport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 md:col-span-1" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!student || !reportCard) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Öğrenci Bulunamadı</h2>
        <p className="text-muted-foreground mt-2">Geçersiz veya silinmiş bir öğrenci kaydı aradınız.</p>
        <Link href="/ogrenciler">
          <Button className="mt-4">Öğrenci Listesine Dön</Button>
        </Link>
      </div>
    );
  }

  // Format data for radar charts
  const getRadarData = (sport: string) => {
    const metricsForSport = reportCard.metrics.filter(m => m.sport === sport);
    if (metricsForSport.length === 0) return null;
    
    // Take the most recent evaluation
    const latest = metricsForSport.sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime())[0];
    
    return [
      { subject: 'Hız', A: latest.speed, fullMark: 10 },
      { subject: 'Dayanıklılık', A: latest.endurance, fullMark: 10 },
      { subject: 'Güç', A: latest.strength, fullMark: 10 },
      { subject: 'Çeviklik', A: latest.agility, fullMark: 10 },
      { subject: 'Teknik', A: latest.technique, fullMark: 10 },
      { subject: 'Takım Oyunu', A: latest.teamwork, fullMark: 10 },
    ];
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (score >= 7.0) return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
    if (score >= 5.0) return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
    return "text-red-600 bg-red-100 dark:bg-red-900/30";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/ogrenciler">
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{student.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
              <User className="h-3 w-3" />
              <span>Sınıf: {student.className}</span>
              <Separator orientation="vertical" className="h-3" />
              <span>Genel Ortalama: </span>
              <Badge variant="secondary" className={getScoreColor(reportCard.overallAverage)}>
                {reportCard.overallAverage.toFixed(1)} / 10
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={() => setMeasurementOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Yeni Ölçüm Ekle
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Öğrenci Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-background p-2 rounded-md shadow-sm text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">YAŞ</p>
                  <p className="text-lg font-semibold leading-none">{calculateAge(student.birthDate)} Yaş</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-background p-2 rounded-md shadow-sm text-primary">
                  <Ruler className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">BOY</p>
                  <p className="text-lg font-semibold leading-none">{student.height} cm</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-background p-2 rounded-md shadow-sm text-primary">
                  <Weight className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">KİLO</p>
                  <p className="text-lg font-semibold leading-none">{student.weight} kg</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-3">Branş Ortalamaları</h4>
              <div className="space-y-3">
                {reportCard.sportAverages.length > 0 ? (
                  reportCard.sportAverages.map(sa => (
                    <div key={sa.sport} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="capitalize font-medium">{sa.sport}</span>
                        <span className="font-bold">{sa.averageScore.toFixed(1)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${sa.averageScore >= 8 ? 'bg-green-500' : sa.averageScore >= 6 ? 'bg-blue-500' : 'bg-orange-500'}`} 
                          style={{ width: `${(sa.averageScore / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Henüz değerlendirme bulunmuyor.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Performans Analizi</CardTitle>
                <CardDescription>Son değerlendirmelere göre branş bazlı yetenek analizi</CardDescription>
              </div>
              <Link href={`/performans?studentId=${student.id}`}>
                <Button variant="outline" size="sm">
                  <Activity className="h-4 w-4 mr-2" /> Yeni Değerlendirme
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {reportCard.metrics.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-8">
                  {reportCard.sportAverages.map(sa => {
                    const data = getRadarData(sa.sport);
                    if (!data) return null;
                    return (
                      <div key={sa.sport} className="flex flex-col items-center">
                        <h4 className="font-bold capitalize text-lg mb-2">{sa.sport}</h4>
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                              <PolarGrid gridType="polygon" stroke="hsl(var(--border))" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                              <Radar name={student.name} dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                  <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="text-lg font-medium">Değerlendirme Yok</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    Öğrenciye ait performans verisi bulunamadı. Radar grafikleri oluşturmak için değerlendirme ekleyin.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Değerlendirme Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              {reportCard.metrics.length > 0 ? (
                <div className="space-y-4">
                  {[...reportCard.metrics].sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime()).map(metric => (
                    <div key={metric.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg">
                      <div className="flex-none w-32 border-b sm:border-b-0 sm:border-r pb-2 sm:pb-0 pr-4">
                        <div className="font-bold capitalize text-lg">{metric.sport}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(metric.evaluationDate).toLocaleDateString('tr-TR')}
                        </div>
                        <div className="mt-2 inline-block px-2 py-1 bg-primary/10 text-primary font-bold rounded text-lg">
                          {metric.overallScore.toFixed(1)}
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Hız:</span> <span className="font-medium">{metric.speed}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Dayanıklılık:</span> <span className="font-medium">{metric.endurance}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Güç:</span> <span className="font-medium">{metric.strength}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Çeviklik:</span> <span className="font-medium">{metric.agility}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Teknik:</span> <span className="font-medium">{metric.technique}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Takım Oyunu:</span> <span className="font-medium">{metric.teamwork}</span></div>
                        {metric.notes && (
                          <div className="col-span-full mt-2 pt-2 border-t">
                            <span className="text-muted-foreground text-xs uppercase font-semibold">Notlar:</span>
                            <p className="mt-1 text-sm italic">"{metric.notes}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center text-muted-foreground py-4">Geçmiş değerlendirme bulunmuyor.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <NewMeasurementModal
        open={measurementOpen}
        onClose={() => setMeasurementOpen(false)}
        student={student}
      />
    </div>
  );
}
