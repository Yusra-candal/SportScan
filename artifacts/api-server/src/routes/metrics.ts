import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, metricsTable } from "@workspace/db";
import {
  ListMetricsQueryParams,
  ListMetricsResponse,
  CreateMetricBody,
  UpdateMetricParams,
  UpdateMetricBody,
  UpdateMetricResponse,
  DeleteMetricParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function calculateOverallScore(speed: number, endurance: number, strength: number, agility: number, technique: number, teamwork: number): number {
  return Math.round(((speed + endurance + strength + agility + technique + teamwork) / 6) * 100) / 100;
}

router.get("/metrics", async (req, res): Promise<void> => {
  const params = ListMetricsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.studentId) {
    conditions.push(eq(metricsTable.studentId, params.data.studentId));
  }
  if (params.data.sport) {
    conditions.push(eq(metricsTable.sport, params.data.sport));
  }

  const metrics = await db
    .select()
    .from(metricsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(metricsTable.createdAt);

  res.json(ListMetricsResponse.parse(metrics));
});

router.post("/metrics", async (req, res): Promise<void> => {
  const parsed = CreateMetricBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const overallScore = calculateOverallScore(
    parsed.data.speed,
    parsed.data.endurance,
    parsed.data.strength,
    parsed.data.agility,
    parsed.data.technique,
    parsed.data.teamwork
  );

  const [metric] = await db
    .insert(metricsTable)
    .values({ ...parsed.data, overallScore })
    .returning();

  res.status(201).json(UpdateMetricResponse.parse(metric));
});

router.patch("/metrics/:id", async (req, res): Promise<void> => {
  const params = UpdateMetricParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMetricBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(metricsTable)
    .where(eq(metricsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Metric not found" });
    return;
  }

  const updated = { ...existing, ...parsed.data };
  const overallScore = calculateOverallScore(
    updated.speed,
    updated.endurance,
    updated.strength,
    updated.agility,
    updated.technique,
    updated.teamwork
  );

  const [metric] = await db
    .update(metricsTable)
    .set({ ...parsed.data, overallScore })
    .where(eq(metricsTable.id, params.data.id))
    .returning();

  res.json(UpdateMetricResponse.parse(metric));
});

router.delete("/metrics/:id", async (req, res): Promise<void> => {
  const params = DeleteMetricParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [metric] = await db
    .delete(metricsTable)
    .where(eq(metricsTable.id, params.data.id))
    .returning();

  if (!metric) {
    res.status(404).json({ error: "Metric not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
