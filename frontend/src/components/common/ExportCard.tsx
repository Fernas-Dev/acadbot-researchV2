import { useState } from "react";
import { Download, FileSpreadsheet, FileText, FileType2, Loader2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
} from "@/components/ui/primitives.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { useExportDownload } from "@/hooks/queries.js";
import { useToast } from "@/hooks/useToast.js";
import type { ExportFormat, ExportKind } from "@/types";

const FORMATS: Array<{ value: ExportFormat; label: string; icon: typeof FileText }> = [
  { value: "docx", label: "DOCX (Word)", icon: FileType2 },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "csv", label: "CSV (Excel)", icon: FileSpreadsheet },
  { value: "bibtex", label: "BibTeX", icon: FileText },
  { value: "ris", label: "RIS (Zotero/Mendeley)", icon: FileText },
];

/**
 * Exportação (§32) — gerada no backend, respeitando os dados existentes
 * (campos ausentes saem como "Não informado").
 */
export function ExportCard({
  kind,
  title,
  jobId,
  matrixId,
  projectId,
  citationStyle = "apa7",
  compact = false,
}: {
  kind: ExportKind;
  title: string;
  jobId?: string;
  matrixId?: string;
  projectId?: string | null;
  citationStyle?: "apa7" | "abnt";
  compact?: boolean;
}): JSX.Element {
  const [format, setFormat] = useState<ExportFormat>(kind === "matrix" ? "docx" : "pdf");
  const download = useExportDownload();
  const { toast } = useToast();

  const handleExport = async (): Promise<void> => {
    try {
      await download.mutateAsync({ kind, format, jobId, matrixId, projectId, title, citationStyle });
      toast({ title: "Exportação iniciada", description: "O ficheiro está a ser transferido.", variant: "success" });
    } catch (error) {
      toast({
        title: "Não foi possível exportar",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
  };

  const content = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1 space-y-1.5">
        <Label htmlFor={`export-format-${kind}`}>Formato</Label>
        <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
          <SelectTrigger id={`export-format-${kind}`}>
            <SelectValue placeholder="Escolher formato" />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleExport} disabled={download.isPending}>
        {download.isPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        Exportar
      </Button>
    </div>
  );

  if (compact) return content;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {content}
        <p className="text-xs text-muted-foreground">
          DOCX, PDF e CSV estão disponíveis. BibTeX e RIS permitem importar noutros gestores de referências. Campos sem
          informação são exportados como “Não informado”.
        </p>
      </CardContent>
    </Card>
  );
}
