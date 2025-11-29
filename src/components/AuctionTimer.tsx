import { useEffect } from "react";
import { Timer, AlertTriangle } from "lucide-react";

interface AuctionTimerProps {
  timeLeft: number;
  isRunning: boolean;
  onTimeUp: () => void;
}

export const AuctionTimer = ({ timeLeft, isRunning, onTimeUp }: AuctionTimerProps) => {
  const percentage = (timeLeft / 15) * 100;
  const isUrgent = timeLeft <= 5;

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      onTimeUp();
    }
  }, [timeLeft, isRunning, onTimeUp]);

  return (
    <div className="auction-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer className={`w-6 h-6 ${isUrgent ? "text-destructive animate-pulse-fast" : "text-primary"}`} />
          <span className="font-oswald text-xl uppercase tracking-wider text-foreground">Bidding Timer</span>
        </div>
        {isUrgent && (
          <div className="flex items-center gap-1 text-destructive animate-pulse-fast">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-bold">HURRY!</span>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="text-center mb-4">
          <span className={`font-oswald text-8xl font-bold ${isUrgent ? "text-destructive animate-countdown" : "text-primary"}`}>
            {timeLeft}
          </span>
          <span className="text-2xl text-muted-foreground ml-2">seconds</span>
        </div>

        <div className="h-4 bg-secondary rounded-full overflow-hidden">
          <div
            className={`timer-bar transition-all duration-1000 ${isUrgent ? "!bg-destructive" : ""}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
