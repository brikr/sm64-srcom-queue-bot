import {MessageEmbed, WebhookClient} from 'discord.js';

import {environment} from './environment';
import {
  ExaminedRun,
  getAllUnverifiedRuns,
  getRecentlyExaminedRuns,
  SUPER_MARIO_64,
  SUPER_MARIO_64_MEMES,
} from './srcom';

const webhookClient = new WebhookClient(
  environment.webhookChannelId,
  environment.webhookSecret
);

export async function sendStatsToDiscord() {
  const sm64Unverified = await getAllUnverifiedRuns(SUPER_MARIO_64);
  const memesUnverified = await getAllUnverifiedRuns(SUPER_MARIO_64_MEMES);
  const sm64RecentlyExamined = await getRecentlyExaminedRuns(SUPER_MARIO_64);
  const memesRecentlyExamined = await getRecentlyExaminedRuns(
    SUPER_MARIO_64_MEMES
  );

  // Convert both recently examined sets to a "leaderboard" of examiners
  const runsExaminedByUser: {[key: string]: number} = {};

  const addToRunsExaminedByUser = (run: ExaminedRun) => {
    if (runsExaminedByUser[run.examiner] === undefined) {
      runsExaminedByUser[run.examiner] = 0;
    }
    runsExaminedByUser[run.examiner]++;
  };

  sm64RecentlyExamined.forEach(addToRunsExaminedByUser);
  memesRecentlyExamined.forEach(addToRunsExaminedByUser);

  const runsExaminedByUserSorted = Object.entries(runsExaminedByUser).sort(
    (a, b) => b[1] - a[1]
  );
  const runsExaminedByUserValues = runsExaminedByUserSorted.map(
    ([name, count]) => `${name}: ${count}`
  );

  // Send message to Discord
  const embed = new MessageEmbed({
    title: 'Speedrun.com Queue Statistics',
    fields: [
      {
        name: 'Runs currently in `sm64` queue',
        value: sm64Unverified.length,
        inline: true,
      },
      {
        name: 'Runs currently in `sm64memes` queue',
        value: memesUnverified.length,
        inline: true,
      },
      {
        name: 'Runs examined by user (last 24 hours, both queues)',
        value: runsExaminedByUserValues.join('\n'),
      },
    ],
  });
  embed.setTimestamp();

  try {
    await webhookClient.send({
      embeds: [embed],
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
}
