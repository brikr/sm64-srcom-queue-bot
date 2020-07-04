// Creates environment.ts by replacing fields in environment.sample.ts with values from system environment.
// Used by CircleCI to create environment that points to the right channel.

import {writeFileSync} from 'fs';

function createEnvironmentFile(webhookChannelId: string, webhookSecret: string) {
  const content = `
    export const environment = {
      webhookChannelId: '${webhookChannelId}',
      webhookSecret: '${webhookSecret}',
    }
  `;

  writeFileSync('src/environment/environment.ts', content, {encoding: 'utf8'});
}

const webhookChannelId = process.env.DISCORD_WEBHOOK_CHANNEL_ID || '';
const webhookSecret = process.env.DISCORD_WEBHOOK_SECRET || '';
createEnvironmentFile(webhookChannelId, webhookSecret);
