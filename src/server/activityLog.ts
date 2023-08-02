import * as fs from 'fs';
import { Request, Response } from 'express';

const LOGS_DIR = './activity-logs';

export function activityLog(req: Request, res: Response) {
  const json = req.body;

  const logpath = `${LOGS_DIR}/${json.sessionId}.json`;
  fs.writeFileSync(logpath, JSON.stringify(json));

  res.send(JSON.stringify({ success: true }));
}
