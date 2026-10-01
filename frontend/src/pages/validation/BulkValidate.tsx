import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet, Loader2, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Badge, Button, Card, CardContent, Label, Progress, Textarea } from "@/components/ui/primitives.js";
import { ValidationStatusBadge } from "@/components/common/badges.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.js";
import { useBulkValidate } from "@/hooks/dataQueries.js";
import { useToast } from "@/hooks/useToast.js";
import type { BulkValidationItem } from "@/types";

const EXAMPLE =
  "MANKIW, N. Gregory. Introdução à Economia. São Paulo: Cengage Learning, 2014.";

/** Validação em massa (§24): uma referência por linha, tabela com estado e confiança. */
export default function BulkValidatePage(): JSX.Element {
  const [raw, setRaw] = useState("");
  const bulk = useBulkValidate();
  const { toast } = useToast();
  const [items, setItems] = useState<BulkValidationItem[]>([]);
  const [skipped, setSkipped] = useState(0);

  const references = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length >= 10);

  const handleRun = async (): Promise<void> => {
    if (references.length === 0) {
      toast({ title: "Cole pelo menos uma referência (uma por linha).", variant: "warning" });
      return;
    }
    try {
      const data = await bulk.mutateAsync(references);
      setItems(data.items);
      setSkipped(data.skipped);
      if (data.skipped > 0) {
        toast({
          title: `${data.skipped} referência(s) ignoradas`,
          description: "Atingiu o limite diário de validações do plano gratuito.",
          variant: "warning",
        });
      }
    } catch (error) {
      toast({
        title: "Não foi possível validar em massa",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
  };

  const exportCsv = (): void => {
    const header = "Numero;Referencia;Estado;Confianca;Problemas";
    const lines = items.map((item) =>
      [
        item.number,
        `"${item.reference.replace(/"/g, '""')}"`,
        item.status,
        item.confidence,
        `"${item.problems.join(" | ")}"`,
      ].join(";"),
    );
    const blob = new Blob([`\uFEFF${[header, ...lines].join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "validacao-em-massa.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validação em massa"
        description="Cole várias referências separadas por linha. Cada uma é validada individualmente."
        actions={
          <>
            {items.length > 0 ? (
              <Button variant="outline" onClick={exportCsv}>
                <FileSpreadsheet className="size-4" />
                Exportar CSV
              </Button>
            ) : null}
            <Button variant="ghost" asChild>
              <Link to="/validate">
                <ArrowLeft className="size-4" />
                Validação individual
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="bulk">Referências (uma por linha)</Label>
            <Textarea
              id="bulk"
              rows={7}
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              placeholder={EXAMPLE}
            />
            <p className="text-xs text-muted-foreground">{references.length} referência(s) detetada(s).</p>
          </div>

          <Button onClick={() => void handleRun()} disabled={bulk.isPending}>
            {bulk.isPending ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
            Validar todas
          </Button>

          {bulk.isPending ? (
            <div className="space-y-2">
              <Progress value={50} />
              <p className="text-xs text-muted-foreground">
                A validar referências — isto pode demorar alguns segundos…
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Confiança</TableHead>
              <TableHead>Problemas</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={`${item.number}-${item.id ?? "x"}`}>
                <TableCell>{item.number}</TableCell>
                <TableCell className="max-w-md">
                  <span className="line-clamp-2">{item.reference}</span>
                </TableCell>
                <TableCell>
                  <ValidationStatusBadge status={item.status} />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.confidence}%</Badge>
                </TableCell>
                <TableCell className="max-w-xs">
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {item.problems.length ? item.problems.join(" · ") : "—"}
                  </span>
                </TableCell>
                <TableCell>
                  {item.id ? (
                    <Link to={`/validate/${item.id}`} className="text-xs text-primary hover:underline">
                      Ver detalhes
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}


      {skipped > 0 ? (
        <p className="text-sm text-muted-foreground">
          {skipped} referência(s) não processadas por limite de quota.
        </p>
      ) : null}
    </div>
  );
}
