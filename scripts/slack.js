var Slack = require("slack-node");

exports.postToSlack = ({
  channel = process.env.SLACK_DEFAULT_CHANNEL,
  username = process.env.SLACK_DEFAULT_USERNAME,
  title = process.env.SLACK_DEFAULT_TITLE,
  text = process.env.SLACK_DEFAULT_TEXT,
  webhook = process.env.SLACK_DEFAULT_WEBHOOK,
  icon_emoji = process.env.SLACK_DEFAULT_EMOJI,
  mrkdwn = true
}) => {
  return new Promise(resolve => {
    slack = new Slack();
    slack.setWebhook(webhook);
    slack.webhook(
      {
        channel,
        username,
        text,
        icon_emoji,
        mrkdwn
      },
      err => {
        if (err) console.log(err);
        resolve({ err });
      }
    );
  });
};
