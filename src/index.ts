import * as express from 'express';
import {sendDailyStatsToDiscord, sendFlaggedRunsToDiscord} from './discord';
import {getAllUnverifiedRuns, SUPER_MARIO_64, SUPER_MARIO_64_MEMES, getRecentlyExaminedRuns} from './srcom';

const app = express();

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

app.listen(8080, () => {
  console.log('listenin');
});
