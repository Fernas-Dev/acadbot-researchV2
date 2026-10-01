import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/primitives.js";

export default function NotFoundPage(): JSX.Element {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-secondary">
        <Compass className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          O endereço pedido não existe ou foi movido. Volta ao painel para continuar a sua pesquisa.
        </p>
      </div>
      <Button asChild>
        <Link to="/dashboard">Ir para o Dashboard</Link>
      </Button>
    </div>
  );
}
