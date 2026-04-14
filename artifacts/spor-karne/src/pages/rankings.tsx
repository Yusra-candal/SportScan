import { useState } from "react";
import { useGetRankings, getGetRankingsQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award } from "lucide-react";
import { Link } from "wouter";

export default function Rankings() {
  const [activeTab, setActiveTab] = useState<"voleybol" | "basketbol" | "futbol">("voleybol");

  const { data: rankings, isLoading } = useGetRankings(activeTab, {
    query: { queryKey: getGetRankingsQueryKey(activeTab) }
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500 mx-auto" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400 mx-auto" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-700 mx-auto" />;
      default:
        return <span className="font-bold text-muted-foreground">{rank}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sıralamalar</h1>
        <p className="text-muted-foreground mt-1">Branş bazında en yüksek ortalamaya sahip öğrenciler.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mb-8">
          <TabsTrigger value="voleybol">Voleybol</TabsTrigger>
          <TabsTrigger value="basketbol">Basketbol</TabsTrigger>
          <TabsTrigger value="futbol">Futbol</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{activeTab} Sıralaması</CardTitle>
              <CardDescription>
                Tüm değerlendirmelerin ortalamasına göre sıralanmıştır.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] text-center">Sıra</TableHead>
                    <TableHead>Öğrenci</TableHead>
                    <TableHead>Sınıf</TableHead>
                    <TableHead className="text-center">Değerlendirme Sayısı</TableHead>
                    <TableHead className="text-right">Ortalama Puan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : rankings && rankings.length > 0 ? (
                    rankings.map((entry) => (
                      <TableRow key={entry.studentId} className={entry.rank <= 3 ? "bg-muted/30" : ""}>
                        <TableCell className="text-center font-medium">
                          {getRankIcon(entry.rank)}
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/ogrenciler/${entry.studentId}`} className="hover:underline hover:text-primary">
                            {entry.studentName}
                          </Link>
                        </TableCell>
                        <TableCell>{entry.className}</TableCell>
                        <TableCell className="text-center">{entry.metricCount}</TableCell>
                        <TableCell className="text-right font-bold text-primary text-lg">
                          {entry.averageScore.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        Bu branşta henüz değerlendirme bulunmuyor.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
