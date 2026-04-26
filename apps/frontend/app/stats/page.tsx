"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LineChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";

const CATEGORY_PALETTE = [
  "#ff6b6b",
  "#4ecdc4",
  "#ffd166",
  "#7c5cff",
  "#ff8fab",
  "#00bbf9",
  "#f97316",
  "#22c55e",
  "#e879f9",
  "#14b8a6",
  "#f43f5e",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#fb7185",
  "#f59e0b",
];

function buildCategoryColorMap(categoryIds: string[]) {
  return categoryIds.reduce<Record<string, string>>((acc, categoryId, index) => {
    if (index < CATEGORY_PALETTE.length) {
      acc[categoryId] = CATEGORY_PALETTE[index];
      return acc;
    }

    // Keep generating distinct hues even when categories exceed the fixed palette size.
    const hue = Math.round((index * 137.508) % 360);
    acc[categoryId] = `hsl(${hue} 78% 56%)`;
    return acc;
  }, {});
}

function colorFromCategory(categoryId: string, colorMap: Record<string, string>) {
  return colorMap[categoryId] ?? "#a23e2b";
}

function mutedColorFromCategory(categoryId: string, colorMap: Record<string, string>) {
  const color = colorMap[categoryId];
  if (!color) {
    return "rgba(190, 184, 176, 0.14)";
  }
  return "rgba(190, 184, 176, 0.16)";
}

function ActivePieShape(props: any) {
  return (
    <g>
      <Sector
        cx={props.cx}
        cy={props.cy}
        innerRadius={props.innerRadius}
        outerRadius={props.outerRadius + 10}
        startAngle={props.startAngle}
        endAngle={props.endAngle}
        fill={props.fill}
      />
    </g>
  );
}

function MonthlyPieCard({
  month,
  categoryColors,
}: {
  month: {
    month: string;
    totalParticipants: number;
    categoryCount: number;
    categories: Array<{
      categoryId: string;
      categoryName: string;
      totalParticipants: number;
      participationCount: number;
      }>;
  };
  categoryColors: Record<string, string>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="rounded-[28px] border border-white/70 bg-white/88 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-[#8c7c6a]">{month.month}</p>
          <h4 className="mt-1 text-lg font-semibold">월별 참여 요약</h4>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-border bg-[#f8f2e9] px-3 py-1">카테고리 {month.categoryCount}개</span>
          <span className="rounded-full border border-border bg-[#f8f2e9] px-3 py-1">참여자 {month.totalParticipants}명</span>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <circle cx="50%" cy="50%" r="70" fill="rgba(0,0,0,0.06)" />
              <Pie
                data={month.categories}
                dataKey="totalParticipants"
                nameKey="categoryName"
                innerRadius={46}
                outerRadius={78}
                paddingAngle={3}
                activeIndex={activeIndex}
                activeShape={ActivePieShape}
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {month.categories.map((category, index) => (
                  <Cell key={category.categoryId} fill={colorFromCategory(category.categoryId, categoryColors)} />
                ))}
              </Pie>
              <circle cx="50%" cy="50%" r="38" fill="#fff8ef" stroke="#ead8c1" strokeWidth="2" />
              <Tooltip formatter={(value: number) => [`참여자 ${value}명`, ""]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3">
          {month.categories.map((category, index) => (
            <button
              key={`${month.month}-${category.categoryId}`}
              type="button"
              className="min-w-[11rem] rounded-full border border-[#ead8c1] bg-[#fff8ef] px-4 py-3 text-left transition hover:-translate-y-1"
              onMouseEnter={() => setActiveIndex(index)}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: colorFromCategory(category.categoryId, categoryColors) }}
                />
                <p className="text-sm font-semibold">{category.categoryName}</p>
              </div>
              <p className="mt-1 text-xs text-[#8c7c6a]">참여자 {category.totalParticipants}명</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<any[]>([]);
  const [participations, setParticipations] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonthNumber, setSelectedMonthNumber] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    Promise.all([
      apiFetch<any[]>("/stats/categories/monthly", { token: session.accessToken }),
      apiFetch<any[]>("/participations", { token: session.accessToken }),
    ]).then(([statsData, participationData]) => {
      setStats(statsData);
      setParticipations(participationData);
    });
  }, []);

  const detailRows = stats.map((stat) => {
    const matchingUsers = participations
      .filter((item) => item.categoryId === stat.categoryId && String(item.occurredAt).slice(0, 7) === stat.month)
      .map((item) => item.user?.name ?? item.user?.loginId ?? "알 수 없음");

    const participants = [...new Set(matchingUsers)];

    return {
      ...stat,
      label: `${stat.month} · ${stat.categoryName}`,
      participants,
      totalParticipants: participants.length,
    };
  });

  const groupedByMonth = detailRows.reduce<
    Array<{
      month: string;
      totalParticipants: number;
      categoryCount: number;
      categories: Array<{
        categoryId: string;
        categoryName: string;
        totalParticipants: number;
        participationCount: number;
      }>;
    }>
  >((acc, row) => {
    const existing = acc.find((entry) => entry.month === row.month);
    const uniqueMonthlyParticipants = [
      ...new Set(
        participations
          .filter((item) => String(item.occurredAt).slice(0, 7) === row.month)
          .map((item) => item.user?.name ?? item.user?.loginId ?? "알 수 없음"),
      ),
    ];

    if (existing) {
      existing.totalParticipants = uniqueMonthlyParticipants.length;
      existing.categoryCount += 1;
      existing.categories.push({
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        totalParticipants: row.totalParticipants,
        participationCount: row.participationCount,
      });
      return acc;
    }

    acc.push({
      month: row.month,
      totalParticipants: uniqueMonthlyParticipants.length,
      categoryCount: 1,
      categories: [
        {
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          totalParticipants: row.totalParticipants,
          participationCount: row.participationCount,
        },
      ],
    });
    return acc;
  }, []);

  const availableMonths = [...new Set(groupedByMonth.map((month) => month.month))].sort().reverse();
  const availableYears = [...new Set(availableMonths.map((month) => month.slice(0, 4)))].sort().reverse();
  const availableMonthNumbers = availableMonths
    .filter((month) => month.startsWith(`${selectedYear}-`))
    .map((month) => month.slice(5, 7));
  const availableCategories = Array.from(
    new Map(detailRows.map((row) => [row.categoryId, row.categoryName])).entries(),
  ).map(([id, name]) => ({ id, name }));
  const categoryColors = buildCategoryColorMap(availableCategories.map((category) => category.id));

  useEffect(() => {
    if (!selectedYear && availableYears.length) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    if (!selectedYear) return;
    if (!selectedMonthNumber) {
      setSelectedMonthNumber("ALL");
      return;
    }
    if (selectedMonthNumber !== "ALL" && !availableMonthNumbers.includes(selectedMonthNumber)) {
      setSelectedMonthNumber("ALL");
    }
  }, [availableMonthNumbers, selectedMonthNumber, selectedYear]);

  const selectedMonth =
    selectedYear && selectedMonthNumber && selectedMonthNumber !== "ALL"
      ? `${selectedYear}-${selectedMonthNumber}`
      : "";
  const selectedMonthData = groupedByMonth.find((month) => month.month === selectedMonth) ?? null;
  const monthlySummaryCards = selectedYear
    ? groupedByMonth.filter((month) => month.month.startsWith(`${selectedYear}-`))
    : groupedByMonth;
  const mergedMonthlySummary =
    selectedMonthNumber === "ALL"
      ? {
          month: selectedYear ? `${selectedYear}년 전체` : "전체",
          totalParticipants: [
            ...new Set(
              participations
                .filter((item) =>
                  selectedYear ? String(item.occurredAt).startsWith(`${selectedYear}-`) : true,
                )
                .map((item) => item.user?.name ?? item.user?.loginId ?? "알 수 없음"),
            ),
          ].length,
          categoryCount: Array.from(
            new Set(
              detailRows
                .filter((row) => (selectedYear ? row.month.startsWith(`${selectedYear}-`) : true))
                .map((row) => row.categoryId),
            ),
          ).length,
          categories: availableCategories
            .map((category) => {
              const rows = detailRows.filter(
                (row) =>
                  row.categoryId === category.id &&
                  (selectedYear ? row.month.startsWith(`${selectedYear}-`) : true),
              );
              const participants = [
                ...new Set(
                  participations
                    .filter(
                      (item) =>
                        item.categoryId === category.id &&
                        (selectedYear ? String(item.occurredAt).startsWith(`${selectedYear}-`) : true),
                    )
                    .map((item) => item.user?.name ?? item.user?.loginId ?? "알 수 없음"),
                ),
              ];

              return {
                categoryId: category.id,
                categoryName: category.name,
                totalParticipants: participants.length,
                participationCount: rows.reduce((sum, row) => sum + row.participationCount, 0),
              };
            })
            .filter((category) =>
              selectedCategory === "ALL"
                ? category.totalParticipants > 0
                : category.categoryId === selectedCategory && category.totalParticipants > 0,
            ),
        }
      : null;
  const yearlyChartRows = (selectedYear
    ? [...new Set(detailRows.filter((row) => row.month.startsWith(`${selectedYear}-`)).map((row) => row.month))]
    : [...new Set(detailRows.map((row) => row.month))]
  )
    .sort()
    .map((month) => {
      const monthRows = detailRows.filter((row) => row.month === month);
      const base: Record<string, string | number | null> = {
        month,
        monthLabel: `${Number(month.slice(5, 7))}월`,
      };

      availableCategories.forEach((category) => {
        const match = monthRows.find((row) => row.categoryId === category.id);
        base[category.id] = match ? match.totalParticipants : null;
      });

      return base;
    });
  const filteredChartSourceRows = selectedMonth
    ? detailRows.filter((row) => row.month === selectedMonth)
    : selectedYear
      ? detailRows.filter((row) => row.month.startsWith(`${selectedYear}-`))
      : detailRows;
  const filteredDetailRows = selectedMonth
    ? detailRows.filter((row) => row.month === selectedMonth)
    : detailRows;
  const emphasizedDetailRows =
    selectedCategory === "ALL"
      ? filteredDetailRows
      : filteredDetailRows.filter((row) => row.categoryId === selectedCategory);
  const chartRows = filteredChartSourceRows.map((row) => {
    const isActive = selectedCategory === "ALL" || row.categoryId === selectedCategory;
    return {
      ...row,
      activeParticipants: isActive ? row.totalParticipants : null,
      mutedParticipants: isActive ? null : row.totalParticipants,
    };
  });
  const selectedCategoryMeta =
    selectedCategory === "ALL"
      ? null
      : availableCategories.find((category) => category.id === selectedCategory) ?? null;

  return (
    <PageShell title="월별 통계">
      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold">월별 카테고리 참여 통계</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#6f6255]">
              카테고리를 선택하면 해당 막대와 선만 강조되고,
              {"\n"}
              연도와 월을 바꾸면 같은 기준으로 상단 차트도 함께 갱신됩니다.
              {"\n"}
              다른 카테고리는 회색으로 처리되어
              {"\n"}
              추이를 더 쉽게 비교할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-[#6f6255]" htmlFor="year-select">조회 년도</label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="min-h-11 rounded-full border border-border bg-white px-4 py-2 text-sm"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
            <label className="text-sm text-[#6f6255]" htmlFor="month-select">조회 월</label>
            <select
              id="month-select"
              value={selectedMonthNumber}
              onChange={(event) => setSelectedMonthNumber(event.target.value)}
              className="min-h-11 rounded-full border border-border bg-white px-4 py-2 text-sm"
            >
              {availableMonthNumbers.map((month) => (
                <option key={month} value={month}>
                  {Number(month)}월
                </option>
              ))}
              <option value="ALL">전체</option>
            </select>
            <label className="text-sm text-[#6f6255]" htmlFor="category-select">카테고리</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="min-h-11 rounded-full border border-border bg-white px-4 py-2 text-sm"
            >
              <option value="ALL">전체 보기</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#e4d3bf] bg-[#fff8ef] px-3 py-1 text-sm text-[#6f6255]">
            현재 선택
          </span>
          {selectedCategoryMeta ? (
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
              style={{
                borderColor: colorFromCategory(selectedCategoryMeta.id, categoryColors),
                backgroundColor: `${colorFromCategory(selectedCategoryMeta.id, categoryColors)}18`,
                color: colorFromCategory(selectedCategoryMeta.id, categoryColors),
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colorFromCategory(selectedCategoryMeta.id, categoryColors) }}
              />
              {selectedCategoryMeta.name}
            </span>
          ) : (
            <span className="rounded-full border border-[#d8d3cc] bg-[#f6f3ee] px-3 py-1 text-sm font-semibold text-[#6f6255]">
              전체 카테고리
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {availableCategories.map((category) => {
            const active = selectedCategory === "ALL" || selectedCategory === category.id;
            const color = colorFromCategory(category.id, categoryColors);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition"
                style={{
                  borderColor: active ? color : "#ddd6cd",
                  backgroundColor: active ? `${color}16` : "#f7f4ef",
                  color: active ? color : "#8b8074",
                  boxShadow: active ? `0 0 0 2px ${color}22 inset` : "none",
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {category.name}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className="rounded-full border px-3 py-1 text-sm font-medium transition"
            style={{
              borderColor: selectedCategory === "ALL" ? "#241b17" : "#ddd6cd",
              backgroundColor: selectedCategory === "ALL" ? "#241b17" : "#f7f4ef",
              color: selectedCategory === "ALL" ? "#fff" : "#6f6255",
            }}
          >
            전체
          </button>
        </div>
        <div className="mt-6 h-[320px] sm:h-[420px] xl:h-[520px]">
          {selectedMonthNumber === "ALL" ? (
            yearlyChartRows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyChartRows}>
                  <CartesianGrid stroke="#d7c8b6" strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number, key) => [
                      `${value}명`,
                      availableCategories.find((category) => category.id === key)?.name ?? String(key),
                    ]}
                    labelFormatter={(label) => `${selectedYear}년 ${label}`}
                  />
                  {(selectedCategory === "ALL" ? availableCategories : availableCategories.filter((category) => category.id === selectedCategory)).map((category) => (
                    <Line
                      key={`year-line-${category.id}`}
                      type="monotone"
                      dataKey={category.id}
                      connectNulls
                      stroke={colorFromCategory(category.id, categoryColors)}
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: colorFromCategory(category.id, categoryColors),
                        stroke: "#fff8ef",
                        strokeWidth: 2,
                      }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[#d7c8b6] bg-white/60 px-5 text-center text-sm text-[#6f6255]">
                선택한 연도에 해당하는 월별 카테고리 집계가 없습니다.
              </div>
            )
          ) : chartRows.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartRows}>
                <CartesianGrid stroke="#d7c8b6" strokeDasharray="3 3" />
                <XAxis dataKey="label" angle={-18} textAnchor="end" height={72} interval={0} tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip
                  formatter={(value: number, _name, payload) => [`참여자 ${value}명`, payload?.payload?.categoryName ?? "카테고리"]}
                  labelFormatter={(label) => String(label)}
                />
                <Bar dataKey="mutedParticipants" radius={[12, 12, 0, 0]} barSize={28}>
                  {chartRows.map((row) => (
                    <Cell
                      key={`${row.month}-${row.categoryId}-muted-bar`}
                      fill={mutedColorFromCategory(row.categoryId, categoryColors)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="activeParticipants" radius={[12, 12, 0, 0]} barSize={28}>
                  {chartRows.map((row) => (
                    <Cell
                      key={`${row.month}-${row.categoryId}-active-bar`}
                      fill={colorFromCategory(row.categoryId, categoryColors)}
                    />
                  ))}
                </Bar>
                {selectedCategoryMeta ? (
                  <Line
                    type="monotone"
                    dataKey="activeParticipants"
                    connectNulls
                    stroke={colorFromCategory(selectedCategoryMeta.id, categoryColors)}
                    strokeWidth={4}
                    dot={{
                      r: 5,
                      fill: colorFromCategory(selectedCategoryMeta.id, categoryColors),
                      stroke: "#fff8ef",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 7 }}
                  />
                ) : null}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[#d7c8b6] bg-white/60 px-5 text-center text-sm text-[#6f6255]">
              선택한 기간에 해당하는 월별 카테고리 집계가 없습니다.
            </div>
          )}
        </div>
      </Card>
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold">월별 통계</h3>
            <p className="mt-2 text-sm leading-7 text-[#6f6255]">
              각 월을 따로 나누고,<br />
              카테고리를 원형 분할 조각으로 보여줍니다.<br />
              마우스를 올리면 해당 조각이 살짝 올라와서<br />
              비중을 더 쉽게 볼 수 있습니다.
            </p>
          </div>
          <p className="text-sm text-[#6f6255]">
            {selectedYear
              ? selectedMonthNumber === "ALL"
                ? `${selectedYear}년 전체 기준`
                : `${selectedYear}년 ${Number(selectedMonthNumber)}월 기준`
              : "조회 기간을 선택하세요"}
          </p>
        </div>
        <div className="mt-6">
          {selectedMonthData ? (
            <MonthlyPieCard
              month={{
                ...selectedMonthData,
                categories:
                  selectedCategory === "ALL"
                    ? selectedMonthData.categories
                    : selectedMonthData.categories.filter((category) => category.categoryId === selectedCategory),
              }}
              categoryColors={categoryColors}
            />
          ) : selectedMonthNumber === "ALL" ? (
            mergedMonthlySummary ? (
              <MonthlyPieCard month={mergedMonthlySummary} categoryColors={categoryColors} />
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#d7c8b6] bg-white/60 px-5 py-10 text-center text-sm text-[#6f6255]">
                선택한 연도에 해당하는 월별 통계가 없습니다.
              </div>
            )
          ) : null}
        </div>
      </Card>
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold">참여자 상세</h3>
            <p className="mt-2 text-sm leading-7 text-[#6f6255]">
              선택한 월 기준으로 어떤 참여자들이 포함되어 있는지 함께 확인할 수 있습니다.
            </p>
          </div>
          <p className="text-sm text-[#6f6255]">총 {emphasizedDetailRows.length}개 집계</p>
        </div>
        <div className="mt-6 grid gap-3">
          {emphasizedDetailRows.map((row) => (
            <div key={`${row.month}-${row.categoryId}`} className="rounded-[24px] border border-white/70 bg-white/88 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-[#8c7c6a]">{row.month}</p>
                  <h4 className="mt-1 text-lg font-semibold">{row.categoryName}</h4>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full border border-border bg-[#f8f2e9] px-3 py-1">총 참여자 {row.totalParticipants}명</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-[#6f6255]">참여자</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.participants.length ? (
                    row.participants.map((participant: string) => (
                      <span key={participant} className="rounded-full border border-white/70 bg-[#fff8ef] px-3 py-1 text-sm">
                        {participant}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[#8c7c6a]">참여자 정보 없음</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!emphasizedDetailRows.length ? (
            <div className="rounded-[24px] border border-dashed border-[#d7c8b6] bg-white/60 px-5 py-10 text-center text-sm text-[#6f6255]">
              선택한 카테고리에 해당하는 집계가 없습니다.
            </div>
          ) : null}
        </div>
      </Card>
    </PageShell>
  );
}
