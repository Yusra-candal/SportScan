import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetRecentActivity, getGetRecentActivityQueryKey, useGetClassStats, getGetClassStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Activity, Trophy, BarChart3, TrendingUp, Clock, Scale } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: recentActivity, isLoading: isLoadingActivity } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });
  const { data: classStats, isLoading: isLoadingStats } = useGetClassStats({ query: { queryKey: getGetClassStatsQueryKey() } });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'student_added':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'metric_added':
        return <Activity className="h-4 w-4 text-green-500" />;
      case 'student_updated':
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case 'metric_updated':
        return <Scale className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Genel Bakış</h1>
        <p className="text-muted-foreground mt-1">Öğrenci performansı ve sistem aktivitelerinin özeti.</p>
      </div>

      {isLoadingSummary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Öğrenci</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalStudents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Değerlendirme</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalMetrics}</div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Branş Dağılımı</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {summary.sportBreakdown.map(sb => (
                  <div key={sb.sport} className="flex-1 bg-muted rounded-lg p-3">
                    <div className="text-sm font-medium capitalize mb-1">{sb.sport}</div>
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-bold">{sb.count}</span>
                      <span className="text-xs text-muted-foreground">Ort: {sb.averageScore.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Sınıf İstatistikleri</CardTitle>
            <CardDescription>
              Sınıflara göre ortalama performans ve fiziksel veriler
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : classStats && classStats.length > 0 ? (
              <div className="space-y-4">
                {classStats.map(stat => (
                  <div key={stat.className} className="flex items-center">
                    <div className="w-16 font-bold">{stat.className}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{stat.studentCount} Öğrenci</span>
                        <span className="font-medium">Ortalama Skor: {stat.averageScore.toFixed(1)}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${(stat.averageScore / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-32 text-right text-xs text-muted-foreground pl-4">
                      {stat.averageHeight.toFixed(0)}cm / {stat.averageWeight.toFixed(0)}kg
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Veri bulunamadı</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Son Aktiviteler</CardTitle>
            <CardDescription>
              Sistemdeki en son güncellemeler
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-6">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="mt-0.5 rounded-full bg-muted p-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleDateString('tr-TR', {
                          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Aktivite bulunamadı</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {summary && summary.topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>En Yüksek Performans Gösterenler</CardTitle>
            <CardDescription>
              Tüm branşlardaki en iyi öğrenciler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {summary.topPerformers.map((tp, i) => (
                <Link key={`${tp.studentId}-${tp.sport}`} href={`/ogrenciler/${tp.studentId}`}>
                  <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{tp.studentName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{tp.sport}</p>
                    </div>
                    <div className="font-bold text-primary">{tp.averageScore.toFixed(1)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
