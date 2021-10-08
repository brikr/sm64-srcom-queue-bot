import * as express from 'express';
import {sendDailyStatsToDiscord, sendFlaggedRunsToDiscord, sendRejectedRunToDiscord} from './discord';
import {
  getAllUnverifiedRuns,
  SUPER_MARIO_64,
  SUPER_MARIO_64_MEMES,
  getRecentlyExaminedRuns,
  rejectRun,
  getRun,
} from './srcom';
import {encodeFlags} from './util';
import {environment} from './environment/environment';
import {handleReason} from './reason';
import {handleQueue} from './queue';
import {Logger} from './logger';

const app = express();

// Post a status update about the queue and any approved runs that were flagged.
// Run daily at midnight UTC
app.get('/daily_stats', async (req, res) => {
  if (req.headers['x-appengine-cron'] === undefined) {
    Logger.log('Request is not from GAE cron. Rejecting');
    res.sendStatus(403);
    return;
  }

  const sm64Unverified = await getAllUnverifiedRuns(SUPER_MARIO_64);
  const memesUnverified = await getAllUnverifiedRuns(SUPER_MARIO_64_MEMES);
  const sm64RecentlyExamined = await getRecentlyExaminedRuns(SUPER_MARIO_64);
  const memesRecentlyExamined = await getRecentlyExaminedRuns(SUPER_MARIO_64_MEMES);

  await sendDailyStatsToDiscord({
    sm64Unverified,
    memesUnverified,
    sm64RecentlyExamined,
    memesRecentlyExamined,
  });

  await sendFlaggedRunsToDiscord({sm64RecentlyExamined});

  res.sendStatus(200);
});

// Debug endpoint that gets a run with a certain ID and spits out the Run object which contains flags etc.
app.get('/debug_run', async (req, res) => {
  try {
    const run = await getRun(req.query['id'] as string);
    Logger.log(run);
    res.send({run});
  } catch (e) {
    Logger.error(e);
    res.sendStatus(500);
    res.send('Internal error');
  }
});

// Review pending runs and note any of them that could be autorejected due to their flags.
// Run every 30 minutes
app.get('/review_runs', async (req, res) => {
  if (req.headers['x-appengine-cron'] === undefined) {
    Logger.log('Request is not from GAE cron. Rejecting');
    res.sendStatus(403);
    return;
  }

  const sm64Unverified = await getAllUnverifiedRuns(SUPER_MARIO_64);
  const baseUrl = environment.dev ? 'localhost:8080' : 'https://sm64.dev';

  for (const run of sm64Unverified) {
    if (run.flags.filter(f => f.reject).length > 0) {
      const rejectionMessage =
        `Rejection reason(s): ${baseUrl}/reason?f=${encodeFlags(run.flags)}\n` +
        'Submission guide: https://bthl.es/3s\n' +
        'Fix the submission, and then submit again.';
      if (environment.dev) {
        Logger.log('Would have rejected run:');
        Logger.log(run);
        Logger.log(rejectionMessage);
      } else {
        rejectRun(run, rejectionMessage);
        const rejectionFlags = run.flags.filter(f => f.reject);

        await sendRejectedRunToDiscord({
          rejectedRun: run,
          rejectionFlags,
        });
      }
    }
  }

  res.sendStatus(200);
});

app.get('/reason', handleReason);

app.get('/queue', handleQueue);

app.listen(process.env.PORT || 8080, () => {
  Logger.log('listenin');
  if (environment.dev) {
    Logger.log('dev mode is on');
  }
});
