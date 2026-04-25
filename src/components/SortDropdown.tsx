"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  basePath: string;
  value: string;
};

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: "relevance:desc", label: "Relevancia" },
  { value: "createdAt:desc", label: "Más nuevos" },
  { value: "nombre:asc", label: "Nombre A-Z" },
  { value: "nombre:desc", label: "Nombre Z-A" },
  { value: "precio:asc", label: "Precio: de más bajo a más alto" },
  { value: "precio:desc", label: "Precio: de más alto a más bajo" },
];

export default function SortDropdown({ basePath, value }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (nextValue: string) => {
    const [sortBy, sortDir] = nextValue.split(":");
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("page", "1");
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <label className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
      <span className="whitespace-nowrap font-medium">Ordenar por:</span>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="min-w-[260px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-darkNavBg px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:border-primary focus:outline-none"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
