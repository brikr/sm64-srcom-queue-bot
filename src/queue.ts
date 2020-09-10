import {Request, Response} from 'express';
import {getAllUnverifiedRuns, SUPER_MARIO_64, SUPER_MARIO_64_MEMES, Run} from './srcom';
import {formatDuration} from './util';

export async function handleQueue(req: Request, res: Response) {
  // If true, show the meme queue instead of regular
  const memeQueue = req.query['q'] === 'memes';

  let unverified: Run[];
  if (memeQueue) {
    unverified = await getAllUnverifiedRuns(SUPER_MARIO_64_MEMES);
  } else {
    unverified = await getAllUnverifiedRuns(SUPER_MARIO_64);
  }

  const sm64TableRows = unverified
    .map(run => {
      const time = formatDuration(run.time);
      const flags = run.flags.map(f => f.title).join(', ');
      const submitted = run.submitted.fromNow();

      if (memeQueue) {
        // Category and platform aren't supported for meme queue
        return `
          <tr>
            <td><a href="https://speedrun.com/run/${run.id}">${time}</a></td>
            <td>${flags}</td>
            <td>${submitted}</td>
          </tr>
        `;
      } else {
        const category = `${run.category} star`;
        const platform = run.platform.custom.platform;
        return `
          <tr>
            <td>${category}</td>
            <td><a href="https://speedrun.com/run/${run.id}">${time}</a></td>
            <td>${platform}</td>
            <td>${flags}</td>
            <td>${submitted}</td>
          </tr>
      `;
      }
    })
    .join('');

  let headerRow: string;
  if (memeQueue) {
    // Category and platform aren't supported for meme queue
    headerRow = `
      <th>Time</th>
      <th>Flags</th>
      <th>Submitted</th>
  `;
  } else {
    headerRow = `
      <th>Category</th>
      <th>Time</th>
      <th>Platform</th>
      <th>Flags</th>
      <th>Submitted</th>
    `;
  }

  const html = `
    <head>
      <script async src="https://www.googletagmanager.com/gtag/js?id=UA-173627062-1"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'UA-173627062-1');
      </script>
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

        .root {
          display: flex;
          flex-direction: column;
          align-items: center
        }

        a {
          color: #f48fb1;
        }

        p {
          margin-top: 0;
        }

        table {
          border-collapse: collapse;
        }

        th, td {
          border-bottom: 1px solid hsla(0,0%,100%,.12);
          padding: 8px;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="root">
        <h1>Backup queue</h1>
        <p>
          <a href="/queue">Regular</a> -
          <a href="/queue?q=memes">Memes</a>
        </p>
        <table>
          <thead>
            ${headerRow}
          </thead>
          <tbody>
            ${sm64TableRows}
          </tbody>
        </table>
      </div>
    </body>
  `;

  // Tell browsers not to cache this page so that we can get fresh API data on every load.
  res.header('Cache-Control', 'no-store');
  res.send(html);
}
