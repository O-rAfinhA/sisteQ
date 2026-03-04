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

interface ResponsavelComboboxProps {
  value: string;
  onChange: (value: string) => void;
  usuarios: string[];
  placeholder?: string;
  className?: string;
}

export function ResponsavelCombobox({
  value,
  onChange,
  usuarios,
  placeholder = "Selecione o responsável...",
  className,
}: ResponsavelComboboxProps) {
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
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Digite para filtrar..." />
          <CommandList>
            <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
            <CommandGroup>
              {usuarios.map((usuario) => (
                <CommandItem
                  key={usuario}
                  value={usuario}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === usuario ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {usuario}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
