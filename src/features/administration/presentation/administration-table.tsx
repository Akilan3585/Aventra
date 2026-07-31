import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyOperationsState } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";

export type AdministrationTableRow = { cells: ReactNode[]; id: string };

export function AdministrationTable({ columns, description, emptyDescription, emptyIcon, emptyTitle, rows, title }: {
  columns: string[];
  description: string;
  emptyDescription: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  rows: AdministrationTableRow[];
  title: string;
}) {
  return <Card className="mt-6 overflow-hidden"><div className="border-b border-slate-100 p-5 sm:p-6"><h2 className="font-semibold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>{rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((column, index) => <th className={index === 0 ? "px-6 py-3" : "px-4 py-3"} key={column}>{column}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr className="transition hover:bg-slate-50/70" key={row.id}>{row.cells.map((cell, index) => <td className={index === 0 ? "px-6 py-4" : "px-4 py-4"} key={index}>{cell}</td>)}</tr>)}</tbody></table></div> : <EmptyOperationsState description={emptyDescription} icon={emptyIcon} title={emptyTitle} />}</Card>;
}
