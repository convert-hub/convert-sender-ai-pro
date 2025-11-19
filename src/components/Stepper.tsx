import { Check, Upload, Map as MapIcon, Grid3x3, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  currentPath: string;
}

const steps = [
  { path: "/", label: "Importar", icon: Upload },
  { path: "/map", label: "Mapear", icon: MapIcon },
  { path: "/batches", label: "Blocos", icon: Grid3x3 },
  { path: "/history", label: "Histórico", icon: History },
];

export const Stepper = ({ currentPath }: StepperProps) => {
  const currentIndex = steps.findIndex((step) => step.path === currentPath);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={step.path} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300",
                isCompleted && "bg-success/10 text-success",
                isCurrent && "bg-primary/10 text-primary ring-2 ring-primary/20",
                isPending && "bg-muted/50 text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="text-sm font-medium hidden lg:inline">{step.label}</span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1 transition-all duration-300",
                  index < currentIndex ? "bg-success" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
