import { Router, type IRouter } from "express";
import { eq, avg, count } from "drizzle-orm";
import { db, studentsTable, metricsTable } from "@workspace/db";
import {
  GetRankingsParams,
  GetRankingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/rankings/:sport", async (req, res): Promise<void> => {
  const params = GetRankingsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const results = await db
    .select({
      studentId: studentsTable.id,
      studentName: studentsTable.name,
      className: studentsTable.className,
      averageScore: avg(metricsTable.overallScore),
      metricCount: count(metricsTable.id),
    })
    .from(metricsTable)
    .innerJoin(studentsTable, eq(metricsTable.studentId, studentsTable.id))
    .where(eq(metricsTable.sport, params.data.sport))
    .groupBy(studentsTable.id, studentsTable.name, studentsTable.className)
    .orderBy(avg(metricsTable.overallScore));

  const sorted = results
    .map((r) => ({
      ...r,
      averageScore: Math.round(Number(r.averageScore) * 100) / 100,
      metricCount: Number(r.metricCount),
    }))
    .sort((a, b) => b.averageScore - a.averageScore);

  const ranked = sorted.map((r, i) => ({
    rank: i + 1,
    ...r,
  }));

  res.json(GetRankingsResponse.parse(ranked));
});

export default router;
