const CryptoJS = require("crypto-js");
const axios = require("axios");
const btoa = require("btoa");

function hexToBase64(str) {
  return btoa(
    String.fromCharCode.apply(
      null,
      str
        .replace(/\r|\n/g, "")
        .replace(/([\da-fA-F]{2}) ?/g, "0x$1 ")
        .replace(/ +$/, "")
        .split(" ")
    )
  );
}

exports.getPosts = function(user = "lewisbooth", postCount = 10) {
  var method = "GET";
  var baseURL = "https://api.twitter.com/1.1/statuses/user_timeline.json";

  // These are needed for generating an authentication signature.
  // See https://developer.twitter.com/en/docs/basics/authentication/guides/creating-a-signature.html
  var oauth_consumer_secret = process.env.oauth_consumer_secret;
  var oauth_access_secret = process.env.oauth_access_secret;
  var signingKey = oauth_consumer_secret + "&" + oauth_access_secret;
  var parameters = {
    // 32 byte random string
    oauth_nonce: (Math.random() * 1e49).toString(36),
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_consumer_key: process.env.oauth_consumer_key,
    oauth_token: process.env.oauth_access_token,
    oauth_signature_method: "HMAC-SHA1",
    oauth_version: "1.0",
    screen_name: user,
    count: postCount.toString()
  };

  var sortedParameters = [];

  // Create an array of the above paramenters
  for (key in parameters) {
    sortedParameters.push([
      encodeURIComponent(key),
      encodeURIComponent(parameters[key])
    ]);
  }

  // Sort the parameter array alphabetically by key
  sortedParameters.sort(function(a, b) {
    return a[0] > b[0];
  });

  var parameterString = "";

  // Build a URI string from the sorted parameters
  for (i = 0; i < sortedParameters.length; i++) {
    if (i > 0) parameterString += "&";
    parameterString += sortedParameters[i].join("=");
  }

  var signatureBaseString =
    method +
    "&" +
    encodeURIComponent(baseURL) +
    "&" +
    encodeURIComponent(parameterString);

  var signature = CryptoJS.HmacSHA1(signatureBaseString, signingKey).toString();
  var binarySignature = hexToBase64(signature);
  var signatureURI = encodeURIComponent(binarySignature);

  var signedURL =
    baseURL + "?" + parameterString + "&oauth_signature=" + signatureURI;

  var posts = {};

  axios
    .get(signedURL)
    .then(res => {
      res.data.forEach((post, i) => {
        const created_at = post.created_at
          .split(" ")
          .slice(1, 3)
          .join(" ");
        const postData = {
          created_at,
          permalink: `https://www.twitter.com/AMPstudioUK/status/${
            post.id_str
          }`,
          text: post.text
        };
        if (post.retweeted_status) {
          postData.retweeted_status = post.retweeted_status;
        }
        posts[i] = postData;
      });
      console.log("Fetched new Twitter feeds");
    })
    .catch(err => {
      console.log(err)
      console.log("Error fetching Twitter feed");
      // console.log(err);
      return null;
    });

  return posts;
};
