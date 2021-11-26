import WebTorrent from "webtorrent-hybrid";
import express from "express";
import morgan from "morgan";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CHUNK_SIZE = 10 ** 6; // 1MB

const app = express();

const log = console.log;

app.use(express.urlencoded({ extended: true }));

app.use(morgan("tiny"));

app.get("/", (req, res) => res.status(200).json({ message: "Sever Online." }));

app.get("/video", function (req, res) {
  res.sendFile(__dirname + "/video.html");
});

let clients = {};
let files = {};
let streams = {};

app.get("/magnet/:id/:magnet", (req, res) => {
  let id = req.params.id;
  const range = req.headers.range;
  let magnet = req.params.magnet;
  magnet = magnet.replace("%3A", ":").replace("%3F", "?");
  log(1);
  log(magnet);
  if (!range) res.status(400).send("Require Range header!");
  let videoStream;
  log(`Request: ${id}`);
  if (!(id in clients)) {
    clients[id] = new WebTorrent();
    clients[id].add(magnet, (torrent) => {
      log(`Created ${id}`);
      files[id] = torrent.files.find((file) => file.name.endsWith(".mp4"));
    });
  }

  const interval = setInterval(() => {
    if (id.toString() in files) {
      log(`Served ${id}`);
      const fileSize = files[id].length;
      let start = Number(range.replace(/\D/g, ""));
      let end = Math.min(start + CHUNK_SIZE, fileSize - 1);
      const contentLength = end - start + 1;
      const headers = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
      };
      res.writeHead(206, headers);
      videoStream = files[id].createReadStream({ start, end });
      videoStream.pipe(res);
      clearInterval(interval);
    }
  }, 2000);
});

app.listen(process.env.PORT || 8080, () => {
  log("Listening on 8080.");
});
