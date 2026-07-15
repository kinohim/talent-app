import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

type MenuItem = { href: string; label: string; description: string };

const GENERAL_MENU: MenuItem[] = [
  { href: "/mypage", label: "マイ経歴書", description: "自分の経歴書のメニュー一覧・各項目の編集画面へ進む" },
  {
    href: "/resumes",
    label: "経歴書一覧",
    description: "全社員の経歴書を検索する（氏名・所属・スキル・資格・現場）",
  },
  {
    href: "/dashboard",
    label: "スキルマップ／組織ダッシュボード",
    description: "組織単位のスキル・資格の保有者数と保有者一覧を確認する",
  },
];

const ADMIN_MENU: MenuItem[] = [
  { href: "/admin/departments", label: "部署管理", description: "組織マスタ（事業部＞部署＞Gr）のCRUD" },
  { href: "/admin/skills", label: "スキル管理", description: "スキルカテゴリ・スキルマスタのCRUD" },
  { href: "/admin/certifications", label: "資格管理", description: "資格カテゴリ・資格マスタのCRUD" },
  { href: "/admin/sites", label: "現場管理", description: "プロジェクト経歴で使用する現場マスタのCRUD" },
  { href: "/admin/project-roles", label: "現場ポジション管理", description: "現場での役割マスタのCRUD" },
  { href: "/admin/accounts", label: "アカウント管理", description: "アカウントの登録・権限変更・無効化" },
];

function MenuCard({ item }: { item: MenuItem }) {
  return (
    <Link href={item.href} className="card block transition hover:border-brand-500 hover:shadow-md">
      <h3 className="font-semibold text-brand-700">{item.label}</h3>
      <p className="mt-1 text-sm text-slate-500">{item.description}</p>
    </Link>
  );
}

export default async function TopPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">TOP</h1>
        <p className="text-sm text-slate-500">ようこそ、{session.user.name}さん</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500">一般メニュー</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GENERAL_MENU.map((item) => (
            <MenuCard key={item.href} item={item} />
          ))}
        </div>
      </section>

      {isAdmin && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500">マスタ管理メニュー（管理者）</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ADMIN_MENU.map((item) => (
              <MenuCard key={item.href} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
