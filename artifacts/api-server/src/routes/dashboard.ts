import { Router, type IRouter } from "express";
import { eq, avg, count, desc } from "drizzle-orm";
import { db, studentsTable, metricsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentActivityResponse,
  GetClassStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const [studentCount] = await db.select({ count: count() }).from(studentsTable);
  const [metricCount] = await db.select({ count: count() }).from(metricsTable);

  const sportBreakdownRaw = await db
    .select({
      sport: metricsTable.sport,
      count: count(),
      averageScore: avg(metricsTable.overallScore),
    })
    .from(metricsTable)
    .groupBy(metricsTable.sport);

  const sportBreakdown = sportBreakdownRaw.map((s) => ({
    sport: s.sport,
    count: Number(s.count),
    averageScore: Math.round(Number(s.averageScore) * 100) / 100,
  }));

  const topPerformersRaw = await db
    .select({
      studentId: studentsTable.id,
      studentName: studentsTable.name,
      sport: metricsTable.sport,
      averageScore: avg(metricsTable.overallScore),
    })
    .from(metricsTable)
    .innerJoin(studentsTable, eq(metricsTable.studentId, studentsTable.id))
    .groupBy(studentsTable.id, studentsTable.name, metricsTable.sport)
    .orderBy(desc(avg(metricsTable.overallScore)))
    .limit(5);

  const topPerformers = topPerformersRaw.map((t) => ({
    studentId: t.studentId,
    studentName: t.studentName,
    sport: t.sport,
    averageScore: Math.round(Number(t.averageScore) * 100) / 100,
  }));

  res.json(
    GetDashboardSummaryResponse.parse({
      totalStudents: Number(studentCount.count),
      totalMetrics: Number(metricCount.count),
      sportBreakdown,
      topPerformers,
    })
  );
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const recentStudents = await db
    .select()
    .from(studentsTable)
    .orderBy(desc(studentsTable.createdAt))
    .limit(5);

  const recentMetrics = await db
    .select({
      id: metricsTable.id,
      sport: metricsTable.sport,
      createdAt: metricsTable.createdAt,
      studentName: studentsTable.name,
    })
    .from(metricsTable)
    .innerJoin(studentsTable, eq(metricsTable.studentId, studentsTable.id))
    .orderBy(desc(metricsTable.createdAt))
    .limit(5);

  const activities = [
    ...recentStudents.map((s) => ({
      id: s.id,
      type: "student_added" as const,
      description: `${s.name} ogrenci olarak eklendi (${s.className})`,
      timestamp: s.createdAt.toISOString(),
    })),
    ...recentMetrics.map((m) => ({
      id: m.id + 10000,
      type: "metric_added" as const,
      description: `${m.studentName} icin ${m.sport} degerlendirmesi eklendi`,
      timestamp: m.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
   .slice(0, 10);

  res.json(GetRecentActivityResponse.parse(activities));
});

router.get("/dashboard/class-stats", async (req, res): Promise<void> => {
  const classes = await db
    .select({
      className: studentsTable.className,
      studentCount: count(),
      averageHeight: avg(studentsTable.height),
      averageWeight: avg(studentsTable.weight),
    })
    .from(studentsTable)
    .groupBy(studentsTable.className)
    .orderBy(studentsTable.className);

  const classesWithScores = await Promise.all(
    classes.map(async (c) => {
      const studentsInClass = await db
        .select({ id: studentsTable.id })
        .from(studentsTable)
        .where(eq(studentsTable.className, c.className));

      const studentIds = studentsInClass.map((s) => s.id);

      let averageScore = 0;
      if (studentIds.length > 0) {
        const metricsForClass = await db
          .select({ overallScore: metricsTable.overallScore })
          .from(metricsTable)
          .where(
            eq(metricsTable.studentId, studentIds[0])
          );

        for (let i = 1; i < studentIds.length; i++) {
          const more = await db
            .select({ overallScore: metricsTable.overallScore })
            .from(metricsTable)
            .where(eq(metricsTable.studentId, studentIds[i]));
          metricsForClass.push(...more);
        }

        if (metricsForClass.length > 0) {
          averageScore =
            Math.round(
              (metricsForClass.reduce((sum, m) => sum + m.overallScore, 0) /
                metricsForClass.length) *
                100
            ) / 100;
        }
      }

      return {
        className: c.className,
        studentCount: Number(c.studentCount),
        averageHeight: Math.round(Number(c.averageHeight) * 100) / 100,
        averageWeight: Math.round(Number(c.averageWeight) * 100) / 100,
        averageScore,
      };
    })
  );

  res.json(GetClassStatsResponse.parse(classesWithScores));
});

export default router;
