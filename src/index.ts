import * as express from 'express';
import {sendStatsToDiscord} from './discord';

const app = express();

app.get('/', async (_req, res) => {
  await sendStatsToDiscord();
  res.sendStatus(200);
});

app.listen(8080, () => {
  console.log('listenin');
});
