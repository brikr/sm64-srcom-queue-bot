// Creates environment.ts by replacing fields in environment.sample.ts with values from system environment.
// Used by CircleCI to create environment that points to the right channel.

import {writeFileSync} from 'fs';

function createEnvironmentFile(
  srcomApiKey: string,
  dailyStatsWebhookChannelId: string,
  dailyStatsWebhookSecret: string,
  rejectedRunsWebhookChannelId: string,
  rejectedRunsWebhookSecret: string
) {
  const content = `
    export const environment = {
      srcomApiKey: '${srcomApiKey}',
      dailyStatsWebhookChannelId: '${dailyStatsWebhookChannelId}',
      dailyStatsWebhookSecret: '${dailyStatsWebhookSecret}',
      rejectedRunsWebhookChannelId = '${rejectedRunsWebhookChannelId}',
      rejectedRunsWebhookSecret = '${rejectedRunsWebhookSecret}',
      dev: false,
    }
  `;
  writeFileSync('src/environment/environment.ts', content, {encoding: 'utf8'});
}

const srcomApiKey = process.env.SRCOM_API_KEY || '';
const dailyStatsWebhookChannelId = process.env.DISCORD_WEBHOOK_CHANNEL_ID || '';
const dailyStatsWebhookSecret = process.env.DISCORD_WEBHOOK_SECRET || '';
const rejectedRunsWebhookChannelId = process.env.DISCORD_WEBHOOK_CHANNEL_ID || '';
const rejectedRunsWebhookSecret = process.env.DISCORD_WEBHOOK_SECRET || '';
createEnvironmentFile(
  srcomApiKey,
  dailyStatsWebhookChannelId,
  dailyStatsWebhookSecret,
  rejectedRunsWebhookChannelId,
  rejectedRunsWebhookSecret
);
