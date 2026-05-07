import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import metricsRouter from "./metrics";
import reportCardRouter from "./report-card";
import rankingsRouter from "./rankings";
import dashboardRouter from "./dashboard";
import jumpAnalyzeRouter from "./jump-analyze";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studentsRouter);
router.use(metricsRouter);
router.use(reportCardRouter);
router.use(rankingsRouter);
router.use(dashboardRouter);
router.use(jumpAnalyzeRouter);

export default router;
