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
import {environment} from './environment/environment';
import {handleReason} from './reason';
import {handleQueue} from './queue';
import {getFullRejectionMessage} from './flags';

const app = express();

// Post a status update about the queue and any approved runs that were flagged.
// Run daily at midnight UTC
app.get('/daily_stats', async (req, res) => {
  if (req.headers['x-appengine-cron'] === undefined) {
    console.log('Request is not from GAE cron. Rejecting');
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
    res.send({run, rejectionMessage: getFullRejectionMessage(run)});
  } catch (e) {
    res.sendStatus(500);
    res.send('Internal error');
  }
});

// Review pending runs and note any of them that could be autorejected due to their flags.
// Run every 30 minutes
app.get('/review_runs', async (req, res) => {
  if (req.headers['x-appengine-cron'] === undefined) {
    console.log('Request is not from GAE cron. Rejecting');
    res.sendStatus(403);
    return;
  }

  const sm64Unverified = await getAllUnverifiedRuns(SUPER_MARIO_64);

  for (const run of sm64Unverified) {
    if (run.flags.filter(f => f.reject).length > 0) {
      const rejectionMessage = getFullRejectionMessage(run);
      if (environment.dev) {
        console.log('Would have rejected run:');
        console.log(run);
        console.log(rejectionMessage);
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
  console.log('listenin');
  if (environment.dev) {
    console.log('dev mode is on');
  }
});
