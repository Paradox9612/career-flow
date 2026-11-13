import {
  getAiStatus,
  type VercelLikeRequest,
  type VercelLikeResponse,
} from '../../server/aiHandlers.ts';

export default function handler(
  req: VercelLikeRequest,
  res: VercelLikeResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Method not allowed.' });
    return;
  }
  const result = getAiStatus();
  res.status(result.status).json(result.data);
}
