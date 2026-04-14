import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, studentsTable, metricsTable } from "@workspace/db";
import {
  GetStudentReportCardParams,
  GetStudentReportCardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/students/:id/report-card", async (req, res): Promise<void> => {
  const params = GetStudentReportCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, params.data.id));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const metrics = await db
    .select()
    .from(metricsTable)
    .where(eq(metricsTable.studentId, params.data.id))
    .orderBy(metricsTable.evaluationDate);

  const sportMap = new Map<string, { total: number; count: number }>();
  for (const m of metrics) {
    const existing = sportMap.get(m.sport) || { total: 0, count: 0 };
    existing.total += m.overallScore;
    existing.count += 1;
    sportMap.set(m.sport, existing);
  }

  const sportAverages = Array.from(sportMap.entries()).map(([sport, data]) => ({
    sport,
    averageScore: Math.round((data.total / data.count) * 100) / 100,
    metricCount: data.count,
  }));

  const overallAverage =
    metrics.length > 0
      ? Math.round(
          (metrics.reduce((sum, m) => sum + m.overallScore, 0) / metrics.length) * 100
        ) / 100
      : 0;

  res.json(
    GetStudentReportCardResponse.parse({
      student,
      metrics,
      sportAverages,
      overallAverage,
    })
  );
});

export default router;
