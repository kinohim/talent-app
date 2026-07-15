import { z } from "zod";

/**
 * 駅名のfind-or-create（POST /api/stations）用バリデーション。
 * EDT001の外部駅検索APIから選ばれた駅名をそのまま登録するため項目は駅名のみ。
 */
export const stationCreateSchema = z.object({
  stationName: z.string().trim().min(1, "駅名は必須です").max(100),
});
