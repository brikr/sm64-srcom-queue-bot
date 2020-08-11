import {Response, Request} from 'express';
import {decodeFlags} from './util';

/**
 * Render a simple static web page that provides a reason as to why a run was rejected
 * @param req Request param from express `get` handler
 * @param res Response param from express `get` handler
 */
export function handleReason(req: Request, res: Response) {
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
          <span>Your run was rejected for the following reason(s):</span>
          <ul>
            ${reasonsHtml}
          </ul>
          <div class="divider"></div>
          <span>
            Review the
            <a href="https://ukikipedia.net/wiki/RTA_Guide/Submitting_Runs_to_Speedrun.com" target="_blank">
              Submitting Runs to Speedrun.com</a>
            guide, then correct these fields and re-submit your run.
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
}
