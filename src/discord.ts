import {MessageEmbed, WebhookClient} from 'discord.js';

import {environment} from './environment/environment';
import {ExaminedRun, Run} from './srcom';
import {FLAG_TITLES} from './flags';

const webhookClient = new WebhookClient(environment.webhookChannelId, environment.webhookSecret);

interface DailyStatsParams {
  sm64Unverified: Run[];
  memesUnverified: Run[];
  sm64RecentlyExamined: ExaminedRun[];
  memesRecentlyExamined: ExaminedRun[];
}

export async function sendDailyStatsToDiscord(params: DailyStatsParams) {
  const {sm64Unverified, memesUnverified, sm64RecentlyExamined, memesRecentlyExamined} = params;

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

  const runsExaminedByUserSorted = Object.entries(runsExaminedByUser).sort((a, b) => b[1] - a[1]);
  const runsExaminedByUserValues = runsExaminedByUserSorted.map(([name, count]) => `${name}: ${count}`);

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
    console.debug('Sending message to Discord');
    await webhookClient.send({
      embeds: [embed],
    });
    console.debug('Message sent to Discord');
  } catch (e) {
    console.error(e);
    throw e;
  }
}

interface FlaggedRunsParams {
  sm64RecentlyExamined: ExaminedRun[];
}

export async function sendFlaggedRunsToDiscord(params: FlaggedRunsParams) {
  const {sm64RecentlyExamined} = params;

  const embeds: MessageEmbed[] = [];

  for (const run of sm64RecentlyExamined) {
    if (run.flags && run.flags.length > 0) {
      const flagTitles = run.flags.map(flag => FLAG_TITLES[flag]);
      embeds.push(
        new MessageEmbed({
          title: `Flagged run: ${run.id}`,
          description: flagTitles.join(', '),
          url: `https://speedrun.com/run/${run.id}`,
        })
      );
    }
  }

  // Splice into sub-arrays that aren't more than 10 embeds because that is the limit per message.
  const embedSlices = [];
  for (let begin = 0; begin < embeds.length; begin += 10) {
    embedSlices.push(embeds.slice(begin, begin + 10));
  }

  try {
    console.debug(`Sending ${embedSlices.length} messages to Discord`);
    for (const slice of embedSlices) {
      await webhookClient.send({
        embeds: slice,
      });
    }
    console.debug('Messages sent to Discord');
  } catch (e) {
    console.error(e);
    throw e;
  }
}
