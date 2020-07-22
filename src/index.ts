import * as express from 'express';
import {sendDailyStatsToDiscord, sendFlaggedRunsToDiscord} from './discord';
import {getAllUnverifiedRuns, SUPER_MARIO_64, SUPER_MARIO_64_MEMES, getRecentlyExaminedRuns} from './srcom';
import {runToString} from './util';

const app = express();

// Post a status update about the queue and any approved runs that were flagged.
// Run daily at midnight UTC
app.get('/daily_stats', async (_req, res) => {
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
app.get('/review_runs', async (_req, res) => {
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
        'Your run was automatically rejected for the following reason(s): ' +
        rejectReasons.join(' ') +
        ' Please read the run submission guide on Ukikipedia: https://bthl.es/3s. ' +
        'If you think your run was wrongfully rejected, please reach out to a Moderator on Discord.';

      console.log(
        JSON.stringify({
          type: 'rejection',
          message: `Would have rejected ${runToString(run)}`,
          reason: rejectionMessage,
          runLink: `https://speedrun.com/run/${run.id}`,
          run: run,
        })
      );
    }
  }

  res.sendStatus(200);
});

app.listen(8080, () => {
  console.log('listenin');
});
