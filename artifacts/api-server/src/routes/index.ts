import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import vaultRouter from "./vault";
import grailRouter from "./grail";
import tradesRouter from "./trades";
import forumRouter from "./forum";
import portfolioRouter from "./portfolio";
import dashboardRouter from "./dashboard";
import activityRouter from "./activity";
import aiRouter from "./ai";
import billingRouter from "./billing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(vaultRouter);
router.use(grailRouter);
router.use(tradesRouter);
router.use(forumRouter);
router.use(portfolioRouter);
router.use(dashboardRouter);
router.use(activityRouter);
router.use(aiRouter);
router.use(billingRouter);

export default router;
