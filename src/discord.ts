import {MessageEmbed, WebhookClient} from 'discord.js';

import {environment} from './environment/environment';
import {Flag} from './flags';
import {Logger} from './logger';
import {ExaminedRun, Run} from './srcom';
import {runToString} from './util';

const webhookClient = new WebhookClient(environment.dailyStatsWebhookChannelId, environment.dailyStatsWebhookSecret);
const rejectedRunsWebhookClient = new WebhookClient(
  environment.rejectedRunsWebhookChannelId,
  environment.rejectedRunsWebhookSecret
);

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
    Logger.debug('Sending message to Discord');
    await webhookClient.send({
      embeds: [embed],
    });
    Logger.debug('Message sent to Discord');
  } catch (e) {
    Logger.error(e);
    throw e;
  }
}

interface FlaggedRunsParams {
  sm64RecentlyExamined: ExaminedRun[];
}

interface RejectedRunParams {
  rejectedRun: Run;
  rejectionFlags: Flag[];
}

export async function sendRejectedRunToDiscord(params: RejectedRunParams) {
  const {rejectedRun, rejectionFlags} = params;

  // Send message to Discord
  const embed = new MessageEmbed({
    title: `Rejected Run: ${await runToString(rejectedRun)}`,
    fields: [
      {
        name: 'Reason(s):',
        value: rejectionFlags.map(f => f.title).join('\n'),
      },
    ],
    url: `https://speedrun.com/run/${rejectedRun.id}`,
  });
  embed.setTimestamp();

  try {
    Logger.debug('Sending message to Discord');
    await rejectedRunsWebhookClient.send({
      embeds: [embed],
    });
    Logger.debug('Message sent to Discord');
  } catch (e) {
    Logger.error(e);
    throw e;
  }
}
export async function sendFlaggedRunsToDiscord(params: FlaggedRunsParams) {
  const {sm64RecentlyExamined} = params;

  const embeds: MessageEmbed[] = [];

  for (const run of sm64RecentlyExamined) {
    if (run.flags.length > 0) {
      const flagTitles = run.flags.map(flag => flag.title);
      embeds.push(
        new MessageEmbed({
          title: `Flagged run: ${await runToString(run)}`,
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
    Logger.debug(`Sending ${embedSlices.length} messages to Discord`);
    for (const slice of embedSlices) {
      await webhookClient.send({
        embeds: slice,
      });
    }
    Logger.debug('Messages sent to Discord');
  } catch (e) {
    Logger.error(e);
    throw e;
  }
}
