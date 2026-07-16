// 配置例: app/skills/page.tsx
// （App Router を使っている場合はこのファイルをそのまま app/skills/page.tsx に置けます）

import { SkillDashboard } from "@/components/SkillDashboard";

export default function SkillsPage() {
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
}
