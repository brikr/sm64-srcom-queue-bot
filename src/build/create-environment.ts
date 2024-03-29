// Creates environment.ts by replacing fields in environment.sample.ts with values from system environment.
// Used by CircleCI to create environment that points to the right channel.

import {writeFileSync} from 'fs';

function createEnvironmentFile(
  srcomApiKey: string,
  twitchClientId: string,
  twitchClientSecret: string,
  dailyStatsWebhookChannelId: string,
  dailyStatsWebhookSecret: string,
  rejectedRunsWebhookChannelId: string,
  rejectedRunsWebhookSecret: string
) {
  const content = `
    export const environment = {
      srcomApiKey: '${srcomApiKey}',
      twitchClientId: '${twitchClientId}',
      twitchClientSecret: '${twitchClientSecret}',
      dailyStatsWebhookChannelId: '${dailyStatsWebhookChannelId}',
      dailyStatsWebhookSecret: '${dailyStatsWebhookSecret}',
      rejectedRunsWebhookChannelId: '${rejectedRunsWebhookChannelId}',
      rejectedRunsWebhookSecret: '${rejectedRunsWebhookSecret}',
      dev: false,
    }
  `;
  writeFileSync('src/environment/environment.ts', content, {encoding: 'utf8'});
}

const srcomApiKey = process.env.SRCOM_API_KEY || '';
const twitchClientId = process.env.TWITCH_CLIENT_ID || '';
const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET || '';
const dailyStatsWebhookChannelId = process.env.DAILY_STATS_DISCORD_WEBHOOK_CHANNEL_ID || '';
const dailyStatsWebhookSecret = process.env.DAILY_STATS_DISCORD_WEBHOOK_SECRET || '';
const rejectedRunsWebhookChannelId = process.env.REJECTED_RUNS_DISCORD_WEBHOOK_CHANNEL_ID || '';
const rejectedRunsWebhookSecret = process.env.REJECTED_RUNS_DISCORD_WEBHOOK_SECRET || '';
createEnvironmentFile(
  srcomApiKey,
  twitchClientId,
  twitchClientSecret,
  dailyStatsWebhookChannelId,
  dailyStatsWebhookSecret,
  rejectedRunsWebhookChannelId,
  rejectedRunsWebhookSecret
);
