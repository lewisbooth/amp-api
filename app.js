require("dotenv").config({ path: "variables.env" });
const express = require("express");
const compression = require("compression");
const bodyParser = require("body-parser");
const cron = require("node-cron");
const cors = require("cors");
const app = express();
const { logging } = require("./scripts/logging");
const { postToSlack } = require("./scripts/slack");

const twitter = require("./scripts/twitterFeed");
let twitterPosts = twitter.getPosts("ampstudiouk", 2);

cron.schedule("*/5 * * * *", () => {
  const latestPosts = twitter.getPosts("ampstudiouk", 2);
  if (latestPosts) twitterPosts = latestPosts;
});

app.use(express.static("static"));

app.use(compression());

var whitelist = ["https://amp.studio", "http://localhost:3000"];
const corsOptions = {
  origin: function(origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

app.use(bodyParser.json());

app.use(logging);

app.get("/twitter", (req, res, next) => {
  res.json(twitterPosts);
  if (req.headers["user-agent"].includes("Insights")) {
    res.setHeader("Cache-Control", "public, max-age=604800");
  }
});

app.post("/contact/landing-page", async (req, res, next) => {
  const { name, email, company, industry, message, web, title } = req.body;

  let formattedTitle = `*Title*: ${title}`;

  let errors = {};

  if (!name) errors.name = true;
  if (!email) errors.email = true;
  if (!message) errors.message = true;
  if (web) errors.bot = true;

  if (Object.keys(errors).length > 0) {
    res.status(500);
    res.json(errors);
    return;
  }

  let text = `
*Name:* ${name}
*Email:* ${email}
*Company Name:* ${company}
*Industry:* ${industry}
*Message:* ${message}
  `;

  const slackMessage = await postToSlack({ title: formattedTitle, text });

  if (!slackMessage.err) {
    res.status(200);
    res.send();
  } else {
    errors.slack = true;
    res.status(500);
    res.json(errors);
  }
});

app.set("port", process.env.PORT || 9001);
const server = app.listen(app.get("port"), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});
