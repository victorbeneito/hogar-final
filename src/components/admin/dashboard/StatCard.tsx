import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: "blue" | "green" | "orange" | "purple" | "red";
  href?: string;
  change?: number;
}

const colorClasses = {
  blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
  green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
  orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
  purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
};

const iconBgClasses = {
  blue: "bg-blue-100 dark:bg-blue-900/40",
  green: "bg-green-100 dark:bg-green-900/40",
  orange: "bg-orange-100 dark:bg-orange-900/40",
  purple: "bg-purple-100 dark:bg-purple-900/40",
  red: "bg-red-100 dark:bg-red-900/40",
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
  change,
}: StatCardProps) {
  const content = (
    <div className={`p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${href ? "hover:shadow-lg transition-shadow cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
            {label}
          </p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </h3>
          {change !== undefined && (
            <p className={`text-xs mt-2 ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
              {change >= 0 ? "+" : ""}{change}% este mes
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${iconBgClasses[color]}`}>
          <Icon className={`w-6 h-6 ${colorClasses[color]}`} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
