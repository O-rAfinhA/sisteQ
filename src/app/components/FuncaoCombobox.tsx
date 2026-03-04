import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";

interface Funcao {
  id: string;
  nome: string;
  nivel: string;
  departamento: string;
  ativo: boolean;
  dataCadastro: string;
}

interface FuncaoComboboxProps {
  value: string;
  onChange: (value: string) => void;
  funcoes: Funcao[];
  placeholder?: string;
  className?: string;
}

export function FuncaoCombobox({
  value,
  onChange,
  funcoes,
  placeholder = "Selecione uma função...",
  className,
}: FuncaoComboboxProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Digite para filtrar..." />
          <CommandList>
            <CommandEmpty>Nenhuma função encontrada.</CommandEmpty>
            <CommandGroup>
              {funcoes.map((funcao) => (
                <CommandItem
                  key={funcao.id}
                  value={funcao.nome}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === funcao.nome ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{funcao.nome}</span>
                    {funcao.nivel && (
                      <span className="text-xs text-gray-500">{funcao.nivel}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
