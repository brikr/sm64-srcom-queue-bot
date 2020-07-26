import * as express from 'express';
import {sendDailyStatsToDiscord, sendFlaggedRunsToDiscord} from './discord';
import {getAllUnverifiedRuns, SUPER_MARIO_64, SUPER_MARIO_64_MEMES, getRecentlyExaminedRuns, rejectRun} from './srcom';
import {decodeFlags} from './util';

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
    const rejectReasons = [];
    for (const flag of run.flags) {
      if (flag.reject) {
        rejectReasons.push(flag.rejectMessage);
      }
    }

    if (rejectReasons.length > 0) {
      // Make a note of probable rejection and prepare message.
      const rejectionMessage =
        'Automatically rejected for the following reason(s):\n' +
        rejectReasons.join('\n') +
        '\nSubmission guide: https://bthl.es/3s.\n' +
        'Fix the submission, and then submit again.';

      rejectRun(run, rejectionMessage);
    }
  }

  res.sendStatus(200);
});

app.get('/reason', async (req, res) => {
  const flags = decodeFlags(req.query['f'] as string);

  res.send(flags);
});

app.listen(8080, () => {
  console.log('listenin');
});
