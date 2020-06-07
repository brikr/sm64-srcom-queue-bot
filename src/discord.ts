import {MessageEmbed, WebhookClient} from 'discord.js';

import {environment} from './environment';
import {getAllUnverifiedRuns, getRecentlyExaminedRuns} from './srcom';

const webhookClient = new WebhookClient(
  environment.webhookChannelId,
  environment.webhookSecret
);

export async function sendStatsToDiscord() {
  const unverified = await getAllUnverifiedRuns();
  const recentlyExamined = await getRecentlyExaminedRuns();

  // Convert recentlyExamined to a "leaderboard" of examiners
  const runsExaminedByUser: {[key: string]: number} = {};
  recentlyExamined.forEach(run => {
    if (runsExaminedByUser[run.examiner] === undefined) {
      runsExaminedByUser[run.examiner] = 0;
    }
    runsExaminedByUser[run.examiner]++;
  });
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
        name: 'Runs currently in queue',
        value: unverified.length,
      },
      {
        name: 'Runs examined by user (last 24 hours)',
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
