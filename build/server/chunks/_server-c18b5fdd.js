import { j as json } from './index-2b68e648.js';
import fs from 'fs-extra';
import { p as public_env } from './shared-server-58a5f352.js';
import 'moment';
import { a as GetNowTimestampUTC, b as GetMinuteStartTimestampUTC, G as GetMinuteStartNowTimestampUTC } from './tool-5bef1c33.js';
import Randomstring from 'randomstring';

const API_TOKEN = process.env.API_TOKEN;
const API_IP = process.env.API_IP;
const checkIfValidTag = function(tag) {
  let tags = [];
  let monitors = [];
  try {
    monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
    tags = monitors.map((monitor) => monitor.tag);
    if (tags.indexOf(tag) == -1) {
      throw new Error("not a valid tag");
    }
  } catch (err) {
    return false;
  }
  return true;
};
const store = function(data, authHeader, ip) {
  const tag = data.tag;
  const authToken = authHeader.replace("Bearer ", "");
  if (authToken !== API_TOKEN) {
    return { error: "invalid token", status: 401 };
  }
  if (API_IP !== void 0 && ip != "" && ip !== API_IP) {
    return { error: "invalid ip", status: 401 };
  }
  const resp = {};
  if (data.status === void 0 || ["UP", "DOWN", "DEGRADED"].indexOf(data.status) === -1) {
    return { error: "status missing", status: 400 };
  }
  if (data.latency === void 0 || isNaN(data.latency)) {
    return { error: "latency missing or not a number", status: 400 };
  }
  if (data.timestampInSeconds !== void 0 && isNaN(data.timestampInSeconds)) {
    return { error: "timestampInSeconds not a number", status: 400 };
  }
  if (data.timestampInSeconds === void 0) {
    data.timestampInSeconds = GetNowTimestampUTC();
  }
  data.timestampInSeconds = GetMinuteStartTimestampUTC(data.timestampInSeconds);
  resp.status = data.status;
  resp.latency = data.latency;
  resp.type = "webhook";
  let timestamp = GetMinuteStartNowTimestampUTC();
  try {
    if (data.timestampInSeconds > timestamp) {
      throw new Error("timestampInSeconds is in future");
    }
    if (timestamp - data.timestampInSeconds > 90 * 24 * 60 * 60) {
      throw new Error("timestampInSeconds is older than 90days");
    }
  } catch (err) {
    return { error: err.message, status: 400 };
  }
  if (!checkIfValidTag(tag)) {
    return { error: "invalid tag", status: 400 };
  }
  let monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
  const monitor = monitors.find((monitor2) => monitor2.tag === tag);
  let day0 = {};
  day0[data.timestampInSeconds] = resp;
  fs.writeFileSync(public_env.PUBLIC_KENER_FOLDER + `/${monitor.folderName}.webhook.${Randomstring.generate()}.json`, JSON.stringify(day0, null, 2));
  return { status: 200, message: "success at " + data.timestampInSeconds };
};
async function POST({ request }) {
  const payload = await request.json();
  const authorization = request.headers.get("authorization");
  let ip = "";
  try {
    ip = request.headers.get("x-forwarded-for") || request.socket.remoteAddress || request.headers.get("x-real-ip");
  } catch (err) {
    console.log("IP Not Found " + err.message);
  }
  let resp = store(payload, authorization, ip);
  return json(resp, {
    status: resp.status
  });
}

export { POST };
//# sourceMappingURL=_server-c18b5fdd.js.map