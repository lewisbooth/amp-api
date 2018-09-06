const CryptoJS = require("crypto-js")
const axios = require("axios")
const btoa = require("btoa")

exports.getPosts = function(postCount = 2) {
  const baseURL = "https://api.twitter.com/1.1/statuses/user_timeline.json"

  // These parameters are required for generating an OAuth2 signature.
  // See https://developer.twitter.com/en/docs/basics/authentication/guides/creating-a-signature.html
  const signingKey = `${process.env.oauth_consumer_secret}&${process.env.oauth_access_secret}`
  const parameters = {
    // The user who own the Twitter Developer App account
    screen_name: process.env.twitter_user,
    // Number of posts to fetch
    count: postCount.toString(),
    // Nonce must be a random 32 byte string
    oauth_consumer_key: process.env.oauth_consumer_key,
    oauth_token: process.env.oauth_access_token,
    oauth_nonce: (Math.random() * 1e49).toString(36),
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_signature_method: "HMAC-SHA1",
    oauth_version: "1.0"
  }

  const sortedParameters = Object.keys(parameters)
    // Create an array of the parameters (see above)
    .map(key => [encodeURIComponent(key), encodeURIComponent(parameters[key])])
    // Sort parameters alphabetically
    .sort((a, b) => a[0] > b[0])
    // Create query string from sorted parameters
    .map((parameter, i) => `${i === 0 ? "?" : "&"}${parameter.join("=")}` )
    .join("")

  const signatureBaseString = 
    `GET&${encodeURIComponent(baseURL)}&${encodeURIComponent(sortedParameters)}`

  // Generate hashed URI
  const signature = CryptoJS.HmacSHA1(signatureBaseString, signingKey).toString()
  const signatureURI = encodeURIComponent(hexToBase64(signature))

  // Sign URL with hash
  const signedURL =
    baseURL + "?" + sortedParameters + "&oauth_signature=" + signatureURI

    const posts = {}
    
    axios
    .get(signedURL)
    .then(res => {
      res.data.forEach((post, i) => {
        const postData = {
          created_at: post.created_at.split(" ").slice(1, 3).join(" "),
          permalink: `https://www.twitter.com/AMPstudioUK/status/${post.id_str}`,
          text: post.text
        }
        if (post.retweeted_status) {
          postData.retweeted_status = post.retweeted_status
        }
        posts[i] = postData
      })
    })
    .catch(err => {
      console.log("Error fetching Twitter feed")
      // console.log(err)
      return null
    })
    return posts
  }

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
  )
}
