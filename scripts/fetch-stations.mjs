// 駅マスタの初期データ収集スクリプト(一回限りの実行想定、npm run verify の対象外)。
//
// HeartRails Express API(認証不要・登録不要の無料API)から、指定した都道府県の
// 全路線→全駅を収集し、駅名の重複を除いてJSONに書き出す。
// 出力はリポジトリに保存し(prisma/station-seed-data.json)、以後はこのスクリプトを
// 再実行せずシード(prisma/seed.ts)から読み込む。
//
// 実行方法: node scripts/fetch-stations.mjs [都道府県名...]
// 例:       node scripts/fetch-stations.mjs 東京都
//           node scripts/fetch-stations.mjs  (引数なし=全47都道府県)

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://express.heartrails.com/api/json";
const REQUEST_DELAY_MS = 200; // 無料APIへの配慮(連続リクエスト間隔)
const OUTPUT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "prisma",
  "station-seed-data.json"
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callApi(params) {
  const url = `${API_BASE}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.json();
  if (data?.response?.error) {
    throw new Error(`API error for ${url}: ${data.response.error}`);
  }
  return data.response;
}

async function getPrefectures() {
  const { prefecture } = await callApi({ method: "getPrefectures" });
  return prefecture;
}

async function getLines(prefecture) {
  const { line } = await callApi({ method: "getLines", prefecture });
  return Array.isArray(line) ? line : line ? [line] : [];
}

async function getStationsByLine(line) {
  const { station } = await callApi({ method: "getStations", line });
  const list = Array.isArray(station) ? station : station ? [station] : [];
  return list;
}

async function main() {
  const targetPrefectures = process.argv.slice(2);
  const prefectures =
    targetPrefectures.length > 0 ? targetPrefectures : await getPrefectures();

  console.log(`対象都道府県: ${prefectures.length}件`);

  const stationNames = new Set();
  let lineCount = 0;

  for (const [i, prefecture] of prefectures.entries()) {
    await sleep(REQUEST_DELAY_MS);
    const lines = await getLines(prefecture);
    console.log(`[${i + 1}/${prefectures.length}] ${prefecture}: ${lines.length}路線`);

    for (const line of lines) {
      await sleep(REQUEST_DELAY_MS);
      lineCount += 1;
      try {
        const stations = await getStationsByLine(line);
        for (const s of stations) {
          if (s?.name) stationNames.add(s.name);
        }
      } catch (err) {
        console.warn(`  路線取得スキップ: ${line} (${err.message})`);
      }
    }
  }

  const sorted = Array.from(stationNames).sort((a, b) => a.localeCompare(b, "ja"));
  await writeFile(OUTPUT_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf-8");

  console.log(`路線取得数: ${lineCount}`);
  console.log(`ユニーク駅名数: ${sorted.length}`);
  console.log(`出力先: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
