import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export interface KpiItem {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconClass?: string;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "danger" | "muted";
}

interface KpiCardsProps {
  items: KpiItem[];
  cols?: 2 | 3 | 4 | 5 | 6;
}

const accentMap: Record<NonNullable<KpiItem["accent"]>, string> = {
  primary: "text-primary",
  success: "text-green-600",
  warning: "text-amber-600",
  danger: "text-red-600",
  muted: "text-muted-foreground",
};

export default function KpiCards({ items, cols = 4 }: KpiCardsProps) {
  const colClass = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
    6: "md:grid-cols-6",
  }[cols];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${colClass} gap-4`}>
      {items.map((kpi, i) => {
        const Icon = kpi.icon;
        const colorCls = kpi.iconClass ?? accentMap[kpi.accent ?? "primary"];
        return (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                {Icon ? <Icon className={`h-4 w-4 ${colorCls}`} /> : null}
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
              {kpi.hint ? <p className="text-xs text-muted-foreground mt-1">{kpi.hint}</p> : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
