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


/*------------------------------*/
/*--------- MIDDLEWARE ---------*/
/*------------------------------*/

// Logs each request to the console with timestamp, IP, POST data etc
app.use(logging);
// Enable GZIP compression
app.use(compression());
// Serve static files from the ./static folder
app.use(express.static("static"));
// Parse POST data into a useable format
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

// Allow CORS from these domains
const whitelist = ["https://amp.studio", "http://localhost:3000", "http://localhost:5000"];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));


/*------------------------------*/
/*---------- TWITTER -----------*/
/*------------------------------*/

// Fetch new AMP Twitter posts when script first runs
let twitterPosts = twitter.getPosts("ampstudiouk", 2);
// Refresh AMP Twitter posts every 5 minutes via cron job
cron.schedule("*/5 * * * *", () => {
  const latestPosts = twitter.getPosts("ampstudiouk", 2);
  if (latestPosts) twitterPosts = latestPosts;
});

// Route responds with JSON of latest AMP Twitter posts
app.get("/twitter", (req, res, next) => {
  res.json(twitterPosts);
  if (req.headers["user-agent"].includes("Insights")) {
    res.setHeader("Cache-Control", "public, max-age=604800");
  }
});


/*------------------------------*/
/*----- LANDING PAGE FORMS -----*/
/*------------------------------*/

// Handle landing page contact forms
// Forwards message to our friendly slackbot 🤖
app.post("/contact/landing-page", async (req, res, next) => {
  // Extract useful data into individual variables with ES6 destructuring
  const { name, email, company, industry, message, web, title } = req.body;

  let errors = {};
  if (!name) errors.name = true;
  if (!email) errors.email = true;
  if (!message) errors.message = true;
  if (web) errors.bot = true;
  if (Object.keys(errors).length > 0) {
    res.status(200);
    res.json(errors);
    return;
  }

  // Build the formatted Slack message, 
  let text = `
*Name:* ${name}
*Email:* ${email}
*Company Name:* ${company}
*Industry:* ${industry}
*Message:* ${message}
  `;

  // Add the page reference to the Slack message
  // Keeps track of where the enquiry came from
  if (title) {
    text = `*Offer Page:* ${title}` + text
  }

  // Async post to Slack
  const slackMessage = await postToSlack({ text });

  // Check for errors posting to Slack
  if (!slackMessage.err) errors.slack = true;

  // Send the response back to the client
  res.status(200);
  res.json(errors);
});


/*------------------------------*/
/*----------- SERVER -----------*/
/*------------------------------*/

// Boot up the server
app.set("port", process.env.PORT || 9001);
const server = app.listen(app.get("port"), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});
