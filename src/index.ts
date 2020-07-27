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

  if (flags.length === 0) {
    // No flags, return 400 Bad Request
    res.sendStatus(400);
    return;
  }

  let reasonsHtml = '';
  for (const flag of flags) {
    if (flag.reject) {
      reasonsHtml += `<li>${flag.rejectMessage}</li>`;
    }
  }

  const html = `
    <head>
      <link href="https://fonts.googleapis.com/css?family=Roboto&amp;display=swap" rel="stylesheet">
      <style>
        body {
          background: #303030;
          color: #fff;
          font-family: Roboto,
                       Helvetica Neue Light,
                       Helvetica Neue,
                       Helvetica,
                       Arial,
                       Lucida Grande,
                       sans-serif;
        }

        a {
          color: #f48fb1;
        }

        .root {
          margin-top: 200px;
          display: flex;
          flex-direction: column;
          align-items: center
        }

        .card {
          background: #424242;
          width: 500px;
          padding: 16px;
          box-shadow: 0 2px 1px -1px rgba(0,0,0,.2),
                      0 1px 1px 0 rgba(0,0,0,.14),
                      0 1px 3px 0 rgba(0,0,0,.12);
          border-radius: 4px;
        }

        .divider {
          border-top: 1px solid hsla(0,0%,100%,.12);
          margin: 16px 0;
        }
      </style>
    </head>
    <body>
      <div class="root">
        <div class="card" style="">
          <span>Your run was rejected for the following reasons:</span>
          <ul>
            ${reasonsHtml}
          </ul>
          <div class="divider"></div>
          <span>
            Review the
            <a href="https://ukikipedia.net/wiki/RTA_Guide/Submitting_Runs_to_Speedrun.com" target="_blank">
              Submitting Runs to Speedrun.com</a>
            page on Ukikipedia, then correct these fields and re-submit your run.
          </span>
          <br>
          <span>
            If you believe this was a mistake, contact a moderator on our
            <a href="https://discord.gg/0Si1OtnB7Ylmwkwr" target="_blank">Discord server</a>.
          </span>
        </div>
      </div>
    </body>
  `;

  res.send(html);
});

app.listen(8080, () => {
  console.log('listenin');
});
