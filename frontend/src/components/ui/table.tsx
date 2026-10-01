import type { ReactNode } from "react";
import { cn } from "@/lib/utils.js";

export function Table({ className, children }: { className?: string; children: ReactNode }): JSX.Element {
  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table className={cn("w-full caption-bottom text-sm", className)}>{children}</table>
    </div>
  );
}

export const TableHeader = ({ children }: { children: ReactNode }): JSX.Element => (
  <thead className="bg-secondary/50 [&_tr]:border-b">{children}</thead>
);

export const TableBody = ({ children }: { children: ReactNode }): JSX.Element => (
  <tbody className="[&_tr:last-child]:border-0">{children}</tbody>
);

export const TableRow = ({ children, className }: { children: ReactNode; className?: string }): JSX.Element => (
  <tr className={cn("border-b transition-colors hover:bg-secondary/30", className)}>{children}</tr>
);

export function TableHead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <th className={cn("h-10 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}): JSX.Element {
  return (
    <td colSpan={colSpan} className={cn("px-3 py-3 align-top text-sm", className)}>
      {children}
    </td>
  );
}
