// 配置例: pages/skills.tsx
// （Pages Router を使っている場合はこのファイルをそのまま pages/skills.tsx に置けます）

import { SkillDashboard } from "@/components/SkillDashboard";
import type { NextPage } from "next";

const SkillsPage: NextPage = () => {
  return (
    <SkillDashboard
      onExportCerts={() => {
        // TODO: 資格別保有者数のExcel出力を実装
        console.log("export certs");
      }}
      onExportRisk={() => {
        // TODO: 属人化リスク一覧のExcel出力を実装
        console.log("export risk");
      }}
    />
  );
};

export default SkillsPage;
