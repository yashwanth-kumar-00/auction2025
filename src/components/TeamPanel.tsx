import { Team } from "@/data/players";
import { Wallet, Users, Plus, Pencil, Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface TeamPanelProps {
  teams: Team[];
  onBid: (teamId: number) => void;
  onUpdateTeamName: (teamId: number, newName: string) => void;
  onUpdateTeamColor: (teamId: number, newColor: string) => void;
  currentBid: number;
  canBid: boolean;
}

const teamColors = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
];

export const TeamPanel = ({ teams, onBid, onUpdateTeamName, onUpdateTeamColor, currentBid, canBid }: TeamPanelProps) => {
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [colorPickerTeamId, setColorPickerTeamId] = useState<number | null>(null);
  const bidAmount = currentBid + 10;

  const handleStartEdit = (team: Team) => {
    setEditingTeamId(team.id);
    setEditName(team.name);
    setColorPickerTeamId(null);
  };

  const handleSaveEdit = (teamId: number) => {
    if (editName.trim()) {
      onUpdateTeamName(teamId, editName.trim());
    }
    setEditingTeamId(null);
  };

  const handleColorSelect = (teamId: number, color: string) => {
    onUpdateTeamColor(teamId, color);
    setColorPickerTeamId(null);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-oswald text-xl uppercase tracking-wider text-muted-foreground mb-4">
        Teams (Budget: 100 Cr)
      </h3>
      
      <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2">
        {teams.map((team) => {
          const canAfford = team.budget >= bidAmount;
          const isDisabled = !canBid || !canAfford;
          const isEditing = editingTeamId === team.id;
          const showColorPicker = colorPickerTeamId === team.id;
          
          return (
            <div
              key={team.id}
              className="team-card border-l-4"
              style={{ borderLeftColor: team.color }}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: team.color, color: "#fff" }}
                        onClick={() => setColorPickerTeamId(showColorPicker ? null : team.id)}
                        title="Click to change color"
                      >
                        {team.shortName}
                      </span>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 text-sm"
                              onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(team.id)}
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0"
                              onClick={() => handleSaveEdit(team.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-foreground truncate">{team.name}</p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 shrink-0"
                              onClick={() => handleStartEdit(team)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 shrink-0"
                              onClick={() => setColorPickerTeamId(showColorPicker ? null : team.id)}
                            >
                              <Palette className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            ₹{(team.budget / 100).toFixed(1)} Cr
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {team.players.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => onBid(team.id)}
                    disabled={isDisabled}
                    size="sm"
                    className="shrink-0"
                    style={{ 
                      backgroundColor: isDisabled ? undefined : team.color,
                      borderColor: team.color 
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    ₹{bidAmount}L
                  </Button>
                </div>

                {/* Color Picker */}
                {showColorPicker && (
                  <div className="flex flex-wrap gap-2 p-2 bg-secondary rounded-lg animate-slide-in">
                    {teamColors.map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                          team.color === color ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorSelect(team.id, color)}
                      />
                    ))}
                    <input
                      type="color"
                      value={team.color}
                      onChange={(e) => handleColorSelect(team.id, e.target.value)}
                      className="w-8 h-8 rounded-full cursor-pointer border-0"
                      title="Custom color"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
