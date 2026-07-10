import { Router, Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../types/index.js';
import { createLogger } from '../../lib/logger.js';

const router: Router = Router();
const logger = createLogger('api', 'ai-insights-routes');

type InsightSeverity = 'info' | 'warning' | 'critical';
type InsightCategory = 'performance' | 'reliability' | 'security' | 'optimization';

interface AiInsight {
  id: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  category: InsightCategory;
  monitorName: string | null;
  suggestedAction: string;
  confidence: number; // 0-100
}

// Dummy insights. These are static placeholders until a real ML service is wired up.
const DUMMY_INSIGHTS: AiInsight[] = [
  {
    id: 'ins_1',
    title: 'Response time trending upward',
    description:
      'P95 latency for your Production API has increased by ~18% over the last 7 days, correlated with peak traffic windows.',
    severity: 'warning',
    category: 'performance',
    monitorName: 'Production API',
    suggestedAction: 'Consider enabling HTTP caching or scaling the upstream service during peak hours.',
    confidence: 87,
  },
  {
    id: 'ins_2',
    title: 'Repeated timeout incidents',
    description:
      'The Database monitor recorded 4 timeout incidents this month, all resolved within 12 minutes. Pattern suggests connection pool exhaustion.',
    severity: 'critical',
    category: 'reliability',
    monitorName: 'Database',
    suggestedAction: 'Increase connection pool size and add retry-with-backoff on the client side.',
    confidence: 92,
  },
  {
    id: 'ins_3',
    title: 'SSL certificate expiring soon',
    description:
      'The Marketing Site certificate has 21 days remaining. Automated renewal may not be configured.',
    severity: 'warning',
    category: 'security',
    monitorName: 'Marketing Site',
    suggestedAction: 'Enable auto-renewal via your certificate authority or schedule a manual rotation.',
    confidence: 78,
  },
  {
    id: 'ins_4',
    title: 'Uptime above SLA target',
    description:
      'Status page monitors collectively averaged 99.97% uptime over the last 30 days, exceeding the 99.9% SLA.',
    severity: 'info',
    category: 'optimization',
    monitorName: null,
    suggestedAction: 'No action required. You may raise the public SLA badge to 99.95%.',
    confidence: 99,
  },
  {
    id: 'ins_5',
    title: 'Unused notification channel detected',
    description:
      'The Slack webhook configured on Billing API has not delivered any alerts in the last 30 days.',
    severity: 'info',
    category: 'optimization',
    monitorName: 'Billing API',
    suggestedAction: 'Verify the webhook URL is still valid or disable the channel to reduce noise.',
    confidence: 64,
  },
];

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug('Fetching AI insights (dummy)');
    const response: ApiResponse<typeof DUMMY_INSIGHTS> = {
      data: DUMMY_INSIGHTS,
      meta: {
        generatedAt: new Date().toISOString(),
        source: 'dummy',
        note: 'Static placeholder insights. Replace with a real ML/analytics backend.',
      },
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching AI insights');
    next(error);
  }
});

export default router;
