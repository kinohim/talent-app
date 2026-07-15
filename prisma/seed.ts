import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SEED_ACTOR = "seed";

async function main() {
  // --- 組織マスタ（事業部＞部署＞Grの3階層、ADR 0007） ---
  async function ensureDepartment(input: {
    code: string;
    departmentName: string;
    orgLevel: "DIVISION" | "DEPARTMENT" | "GROUP";
    parentId: number | null;
  }) {
    return prisma.department.upsert({
      where: { code: input.code },
      update: { orgLevel: input.orgLevel, parentId: input.parentId },
      create: { ...input, createdBy: SEED_ACTOR, updatedBy: SEED_ACTOR },
    });
  }

  const div1 = await ensureDepartment({
    code: "DIV01",
    departmentName: "システム開発事業部",
    orgLevel: "DIVISION",
    parentId: null,
  });
  const div2 = await ensureDepartment({
    code: "DIV02",
    departmentName: "管理本部",
    orgLevel: "DIVISION",
    parentId: null,
  });

  const dept1 = await ensureDepartment({
    code: "DEP01",
    departmentName: "第一開発部",
    orgLevel: "DEPARTMENT",
    parentId: div1.id,
  });
  const dept2 = await ensureDepartment({
    code: "DEP02",
    departmentName: "第二開発部",
    orgLevel: "DEPARTMENT",
    parentId: div1.id,
  });
  const dept3 = await ensureDepartment({
    code: "DEP03",
    departmentName: "人事総務部",
    orgLevel: "DEPARTMENT",
    parentId: div2.id,
  });
  const dept4 = await ensureDepartment({
    code: "DEP04",
    departmentName: "営業部",
    orgLevel: "DEPARTMENT",
    parentId: div2.id,
  });

  const grp1 = await ensureDepartment({
    code: "GRP01",
    departmentName: "基盤Gr",
    orgLevel: "GROUP",
    parentId: dept1.id,
  });
  const grp2 = await ensureDepartment({
    code: "GRP02",
    departmentName: "アプリGr",
    orgLevel: "GROUP",
    parentId: dept1.id,
  });
  const grp3 = await ensureDepartment({
    code: "GRP03",
    departmentName: "ソリューションGr",
    orgLevel: "GROUP",
    parentId: dept2.id,
  });

  // --- 現場マスタ（MST005、ADR 0007で新設） ---
  const sites = await Promise.all(
    [
      { id: 1, siteName: "A社基幹システム刷新" },
      { id: 2, siteName: "B社ECサイト構築" },
      { id: 3, siteName: "C省庁情報システム運用" },
    ].map((s) =>
      prisma.site.upsert({
        where: { id: s.id },
        update: {},
        create: { ...s, createdBy: SEED_ACTOR, updatedBy: SEED_ACTOR },
      })
    )
  );

  // --- 駅・路線マスタ（管理画面は廃止、データはスクリプト投入: ADR 0007） ---
  const railwayLine = await prisma.railwayLine.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, lineName: "JR山手線", createdBy: SEED_ACTOR, updatedBy: SEED_ACTOR },
  });

  const stations = await Promise.all(
    ["東京", "新宿", "渋谷"].map((name, i) =>
      prisma.station.upsert({
        where: { id: i + 1 },
        update: {},
        create: { id: i + 1, stationName: name, createdBy: SEED_ACTOR, updatedBy: SEED_ACTOR },
      })
    )
  );

  for (const station of stations) {
    await prisma.stationLineLink.upsert({
      where: { lineId_stationId: { lineId: railwayLine.id, stationId: station.id } },
      update: {},
      create: {
        lineId: railwayLine.id,
        stationId: station.id,
        createdBy: SEED_ACTOR,
        updatedBy: SEED_ACTOR,
      },
    });
  }

  // --- スキルマスタ ---
  const skillCategory = await prisma.skillCategory.upsert({
    where: { code: "01" },
    update: {},
    create: { code: "01", categoryName: "開発言語", createdBy: SEED_ACTOR, updatedBy: SEED_ACTOR },
  });
  const dbSkillCategory = await prisma.skillCategory.upsert({
    where: { code: "02" },
    update: {},
    create: { code: "02", categoryName: "DB", createdBy: SEED_ACTOR, updatedBy: SEED_ACTOR },
  });

  const javaSkill = await prisma.skill.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      categoryId: skillCategory.id,
      skillName: "Java",
      hasVersion: true,
      createdBy: SEED_ACTOR,
      updatedBy: SEED_ACTOR,
    },
  });
  const typeScriptSkill = await prisma.skill.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      categoryId: skillCategory.id,
      skillName: "TypeScript",
      hasVersion: false,
      createdBy: SEED_ACTOR,
      updatedBy: SEED_ACTOR,
    },
  });
  const postgresSkill = await prisma.skill.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      categoryId: dbSkillCategory.id,
      skillName: "PostgreSQL",
      hasVersion: false,
      createdBy: SEED_ACTOR,
      updatedBy: SEED_ACTOR,
    },
  });

  const javaVersions = await Promise.all(
    [
      { versionName: "8", versionOrder: 1 },
      { versionName: "11", versionOrder: 2 },
      { versionName: "17", versionOrder: 3 },
    ].map((v) =>
      prisma.skillVersion.upsert({
        where: { id: v.versionOrder },
        update: {},
        create: {
          id: v.versionOrder,
          skillId: javaSkill.id,
          versionName: v.versionName,
          versionOrder: v.versionOrder,
          isActive: true,
          displayName: `Java ${v.versionName}`,
          createdBy: SEED_ACTOR,
          updatedBy: SEED_ACTOR,
        },
      })
    )
  );

  // --- 資格マスタ ---
  const itCategory = await prisma.certificationCategory.upsert({
    where: { code: "10" },
    update: {},
    create: {
      code: "10",
      categoryName: "IT系",
      description: "情報処理技術者試験等",
      createdBy: SEED_ACTOR,
      updatedBy: SEED_ACTOR,
    },
  });

  const basicInfoCert = await prisma.certification.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      categoryId: itCategory.id,
      certificationName: "基本情報技術者",
      certificationOrganization: "IPA",
      createdBy: SEED_ACTOR,
      updatedBy: SEED_ACTOR,
    },
  });
  const appliedInfoCert = await prisma.certification.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      categoryId: itCategory.id,
      certificationName: "応用情報技術者",
      certificationOrganization: "IPA",
      createdBy: SEED_ACTOR,
      updatedBy: SEED_ACTOR,
    },
  });

  await Promise.all(
    ["SE", "PG", "リーダー", "サブリーダー"].map((roleName, i) =>
      prisma.projectRole.upsert({
        where: { id: i + 1 },
        update: {},
        create: { id: i + 1, roleName, createdBy: SEED_ACTOR, updatedBy: SEED_ACTOR },
      })
    )
  );

  // --- 社員・アカウント（4ロール各1名、ADR 0008。パスワードは保持しない: ADR 0007/0009） ---
  const employeesData = [
    {
      employeeId: "000001",
      name: "管理 太郎",
      nameKana: "カンリ タロウ",
      departmentId: dept3.id, // 人事総務部（部署レベル所属）
      role: "ADMIN" as const,
      email: "taro.kanri@example.com",
    },
    {
      employeeId: "000002",
      name: "部長 花子",
      nameKana: "ブチョウ ハナコ",
      departmentId: dept1.id, // 第一開発部（部署レベル所属）
      role: "MANAGER" as const,
      email: "hanako.bucho@example.com",
    },
    {
      employeeId: "000003",
      name: "開発 次郎",
      nameKana: "カイハツ ジロウ",
      departmentId: grp2.id, // アプリGr（Grレベル所属 → 部署解決で第一開発部）
      role: "GENERAL" as const,
      email: "jiro.kaihatsu@example.com",
    },
    {
      employeeId: "000004",
      name: "営業 三奈",
      nameKana: "エイギョウ ミナ",
      departmentId: dept4.id, // 営業部
      role: "HR_SALES" as const,
      email: "mina.eigyo@example.com",
    },
    {
      employeeId: "000005",
      name: "設計 四郎",
      nameKana: "セッケイ シロウ",
      departmentId: grp3.id, // ソリューションGr（第二開発部配下 → 000003とは別部署）
      role: "GENERAL" as const,
      email: "shiro.sekkei@example.com",
    },
    {
      employeeId: "000006",
      name: "基盤 五実",
      nameKana: "キバン イツミ",
      departmentId: grp1.id, // 基盤Gr（第一開発部配下 → 000003と同一部署に解決）
      role: "GENERAL" as const,
      email: "itsumi.kiban@example.com",
    },
    {
      employeeId: "000007",
      name: "人事 六子",
      nameKana: "ジンジ ムツコ",
      departmentId: dept3.id, // 人事総務部
      role: "HR_SALES" as const,
      email: "mutsuko.jinji@example.com",
    },
    {
      employeeId: "000008",
      name: "試験 七海",
      nameKana: "シケン ナナミ",
      departmentId: dept2.id, // 第二開発部（部署レベル所属）
      role: "GENERAL" as const,
      email: "nanami.shiken@example.com",
    },
  ];

  for (const e of employeesData) {
    await prisma.employee.upsert({
      where: { employeeId: e.employeeId },
      update: { departmentId: e.departmentId },
      create: {
        employeeId: e.employeeId,
        name: e.name,
        nameKana: e.nameKana,
        departmentId: e.departmentId,
        nearestStationId: stations[0].id,
        experienceYears: 5,
        careerSummary: "システム開発プロジェクトに従事。",
        selfPr: "継続的な学習を心がけています。",
        createdBy: SEED_ACTOR,
        updatedBy: SEED_ACTOR,
      },
    });

    await prisma.user.upsert({
      where: { employeeId: e.employeeId },
      update: { email: e.email, role: e.role, isActive: true },
      create: {
        employeeId: e.employeeId,
        email: e.email,
        role: e.role,
        isActive: true,
        createdBy: SEED_ACTOR,
        updatedBy: SEED_ACTOR,
      },
    });
  }

  // skillVersionIdがnullな組み合わせはPrisma複合ユニークキーのupsertでは型上null不可のため、
  // findFirst→createの手順で代用する（seedは初回のみ実行される想定でも十分安全）。
  async function ensureEmployeeSkillLink(input: {
    employeeId: string;
    skillId: number;
    skillVersionId: number | null;
    skillLevel: "LOW" | "MID" | "HIGH";
  }) {
    const existing = await prisma.employeeSkillLink.findFirst({ where: input });
    if (existing) return existing;
    return prisma.employeeSkillLink.create({
      data: { ...input, createdBy: SEED_ACTOR, updatedBy: SEED_ACTOR },
    });
  }

  await ensureEmployeeSkillLink({
    employeeId: "000003",
    skillId: javaSkill.id,
    skillVersionId: javaVersions[2].id,
    skillLevel: "HIGH",
  });
  await ensureEmployeeSkillLink({
    employeeId: "000003",
    skillId: typeScriptSkill.id,
    skillVersionId: null,
    skillLevel: "MID",
  });
  await ensureEmployeeSkillLink({
    employeeId: "000002",
    skillId: postgresSkill.id,
    skillVersionId: null,
    skillLevel: "LOW",
  });

  await prisma.employeeCertificationLink.createMany({
    data: [
      {
        employeeId: "000003",
        certificationId: basicInfoCert.id,
        acquiredDate: new Date("2020-04-01"),
        createdBy: SEED_ACTOR,
        updatedBy: SEED_ACTOR,
      },
      {
        employeeId: "000002",
        certificationId: appliedInfoCert.id,
        acquiredDate: new Date("2018-04-01"),
        createdBy: SEED_ACTOR,
        updatedBy: SEED_ACTOR,
      },
    ],
    skipDuplicates: true,
  });

  // --- プロジェクト経歴（siteId参照、ADR 0007。「過去にどの現場に誰がいたか」検索の確認用） ---
  const existingProject = await prisma.project.findFirst({
    where: { employeeId: "000003", siteId: sites[0].id },
  });
  if (!existingProject) {
    await prisma.project.create({
      data: {
        employeeId: "000003",
        siteId: sites[0].id,
        projectTitle: "基幹システム刷新（会計サブシステム）",
        projectSummary: "会計サブシステムの詳細設計〜結合テストを担当。",
        startDate: new Date("2023-04-01"),
        endDate: new Date("2024-03-31"),
        totalTeamSize: "50",
        teamSize: "8",
        createdBy: SEED_ACTOR,
        updatedBy: SEED_ACTOR,
      },
    });
  }

  console.log("Seed completed:", {
    departments: 9,
    sites: sites.length,
    employees: employeesData.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
