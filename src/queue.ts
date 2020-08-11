import {Request, Response} from 'express';
import {getAllUnverifiedRuns, SUPER_MARIO_64} from './srcom';
import {formatDuration} from './util';

export async function handleQueue(_req: Request, res: Response) {
  const sm64Unverified = await getAllUnverifiedRuns(SUPER_MARIO_64);

  const sm64TableRows = sm64Unverified
    .map(run => {
      const category = `${run.category} star`;
      const time = formatDuration(run.time);
      const platform = run.platform.custom.platform;
      const flags = run.flags.map(f => f.title).join(', ');
      return `
      <tr>
        <td>${category}</td>
        <td><a href="https://speedrun.com/run/${run.id}">${time}</a></td>
        <td>${platform}</td>
        <td>${flags}</td>
      </tr>
    `;
    })
    .join('');

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

        a {
          color: #f48fb1;
        }

        .root {
          display: flex;
          flex-direction: column;
          align-items: center
        }

        table {
          border-collapse: collapse;
        }

        th, td {
          border-bottom: 1px solid hsla(0,0%,100%,.12);
          padding: 8px;
        }
      </style>
    </head>
    <body>
      <div class="root">
        <h1>Backup queue</h1>
        <table>
          <thead>
            <th>Category</th>
            <th>Time</th>
            <th>Platform</th>
            <th>Flags</th>
          </thead>
          <tbody>
            ${sm64TableRows}
          </tbody>
        </table>
      </div>
    </body>
  `;

  res.send(html);
}
