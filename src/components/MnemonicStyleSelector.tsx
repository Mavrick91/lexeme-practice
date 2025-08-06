import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Sparkles, Layout, Brain } from "lucide-react";
import type { MnemonicPromptOverrides } from "@/types/mnemonicPrompt";
import { scenarioPresets } from "@/config/mnemonicPromptPresets";

type MnemonicStyleSelectorProps = {
  onStyleChange: (overrides: MnemonicPromptOverrides) => void;
};

export const MnemonicStyleSelector = ({ onStyleChange }: MnemonicStyleSelectorProps) => {
  const [currentScenario, setCurrentScenario] = useState<string>("beginner");

  const handleScenarioChange = (scenario: string) => {
    setCurrentScenario(scenario);
    onStyleChange(scenarioPresets[scenario]);
  };

  const scenarioDescriptions: Record<string, { icon: React.ReactNode; description: string }> = {
    beginner: {
      icon: <Sparkles className="h-4 w-4" />,
      description: "Simple, clear visuals",
    },
    intermediate: {
      icon: <Layout className="h-4 w-4" />,
      description: "Story-based scenes",
    },
    advanced: {
      icon: <Brain className="h-4 w-4" />,
      description: "Complex associations",
    },
    kids: {
      icon: <Palette className="h-4 w-4" />,
      description: "Fun, colorful style",
    },
    quickReview: {
      icon: <Layout className="h-4 w-4" />,
      description: "Minimalist flashcards",
    },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {scenarioDescriptions[currentScenario].icon}
          <span className="capitalize">{currentScenario}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Mnemonic Style</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(scenarioDescriptions).map(([scenario, { icon, description }]) => (
          <DropdownMenuItem
            key={scenario}
            onClick={() => handleScenarioChange(scenario)}
            className="gap-2"
          >
            {icon}
            <div className="flex flex-col">
              <span className="font-medium capitalize">{scenario}</span>
              <span className="text-xs text-muted-foreground">{description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
