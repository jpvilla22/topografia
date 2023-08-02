import * as express from 'express';
import Server from 'webpack-dev-server';
import { activityLog } from './activityLog';

export function setup(server: Server) {
  server.app.use(express.json());

  server.app.post('/api/activity_log', activityLog);
}
