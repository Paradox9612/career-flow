import {
  handleAnalyzeJd,
  runVercelPostHandler,
  type VercelLikeRequest,
  type VercelLikeResponse,
} from '../../server/aiHandlers.ts';

export default async function handler(
  req: VercelLikeRequest,
  res: VercelLikeResponse
) {
  await runVercelPostHandler(req, res, handleAnalyzeJd);
}
