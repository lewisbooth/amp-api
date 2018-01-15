require("dotenv").config({ path: "variables.env" });
const express = require("express");
const compression = require("compression");
const bodyParser = require("body-parser");
const cron = require("node-cron");
const cors = require("cors");
const app = express();

const twitter = require("./scripts/twitterFeed");
let twitterPosts = twitter.getPosts("ampstudiouk", 2);

cron.schedule("*/5 * * * *", () => {
  const latestPosts = twitter.getPosts("ampstudiouk", 2);
  if (latestPosts) twitterPosts = latestPosts;
});

app.use(compression());

app.use("/", (req, res, next) => {
  const timestamp = new Date().toString();
  var ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  console.log(`${timestamp} ${req.method} ${req.path} ${ip}`);
  if (req.method === "POST") {
    console.log(req.body);
  }
  next();
});

app.get("/twitter", cors(), (req, res, next) => {
  res.json(twitterPosts);
});

app.set("port", process.env.PORT || 9001);
const server = app.listen(app.get("port"), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});
