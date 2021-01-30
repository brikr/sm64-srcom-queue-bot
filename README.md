# SM64 speedrun.com Queue Bot
This bot is used by the [Super Mario 64 Speedruns Discord server](https://discord.gg/0Si1OtnB7Ylmwkwr) and provides the following features:
- Posts daily updates to a Discord channel with the current size of queue and how many runs were verified by leaderboard moderators that day.
- Automatically rejects runs that do not follow the [submission guidelines](https://ukikipedia.net/wiki/RTA_Guide/Submitting_Runs_to_Speedrun.com).
- Hosts a "rejection reason" page, a simple page that displays why a run was rejected. This page is linked to in rejection messages.
- Hosts a "backup queue" page, a slimmed-down view of the submission queue that tends to load more reliably than the normal speedrun.com queue.

The bot is a simple Express application that performs the above functions on various endpoints. It's hosted on [App Engine](https://cloud.google.com/appengine) (settings located in `app.yaml`), and the daily updates and run inspection are triggered via [Cloud Scheduler](https://cloud.google.com/scheduler). The cron settings are defined in `cron.yaml`.

# Developer getting started
## Running locally
To run the application locally, you'll need the following:
- A Node environment _to run the bot at all_.
- A speedrun.com API key _to run the bot at all_. Instructions on how to obtain one can be found in [their API documentation](https://github.com/speedruncomorg/api/blob/master/authentication.md).
  - If you wish to take any action on runs (e.g. rejection), the API key must be associated with an account that is a moderator. If the bot is running in dev mode, you can see which actions _would_ be taken on a run without the bot attempting to take any action.
- A Discord webhook channel ID and secret _to send queue stats to a channel_.

After cloning the repository, copy `src/environment/`**`environment.sample.ts`** to `src/environment/`**`environment.ts`**. Replace the placeholder values with your own. It's also recommended that you keep `dev: true` so that the bot doesn't make any changes to submitted runs while you are developing.

To run the bot, you can run `npm run dev` in the root of the repository. This will build your code and then run the server. You should see the message `listenin` once the bot has started. Currently, the bot doesn't hot reload when you make code changes, so you'll want to kill the server and re-run the command when changes are made.

Each of the bot's operations are exposed via an HTTP endpoint hosted on the port defined in your `PORT` environment variable, or on port 8080 if the environment variable is undefined. Make a `GET` request with your favorite HTTP tool (such as [Postman](https://www.postman.com/) or [cURL](https://linuxize.com/post/curl-rest-api/)) to any of these endpoints to trigger their functionality:
- `/daily_stats`: Posts the daily queue stats via the webhook defined in the environment configuration. This endpoint requires the `X-Appengine-Cron` header to be defined (this header prevents someone from posting to the endpoint on production to trigger it).
- `/review_runs`: Reviews the runs currently in the queue and rejects any with flags. If `dev` is `true` in your environment, the bot will log a message that it _would have_ rejected a run, but will not actually reject any runs. This endpoint requires the `X-Appengine-Cron` header to be defined.
- `/reason`: Displays the "rejection reason" page, showing messages for the flags defined in the `f` query parameter. The `encodeFlags`/`decodeFlags` functions in `util.ts` are used to convert a list of flags to a value that can be used as a query parameter for this endpoint.
- `/queue`: Displays the backup queue page.
- `/debug_run`: Queries the run defined by the `id ` query parameter and returns the bot's data representation of that run. Useful for debugging flags or other data about a run that the bot might work with.

## Contribution guidelines
1. The project uses ESLint and Prettier to lint and format the code. Before submitting a PR, please ensure your code passes all linting/formatting warnings and errors. You can use `npm run check` to check for any warnings or errors, and you can use `npm run fix` to fix any warnings or errors that can be automatically fixed. There is a PR check in place to ensure that there are no warnings or errors.
2. Keep logic defined in their appropriate files. Right now, any code that works with a certain part of the system is defined in its respective file (e.g. Discord functions are in `discord.ts`, speedrun.com API things are in `srcom.ts`, and so on).
3. Use plenty of comments on any new code you are adding.
4. Be prepared for @brikr to request many small or large changes on your PR before merging.

Once a PR is merged, the production bot is automatically deployed to and updated via CircleCI.
