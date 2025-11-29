import { Player, Team } from "@/data/players";
import { Trophy, XCircle } from "lucide-react";

interface AuctionResult {
  player: Player;
  team: Team | null;
  soldPrice: number | null;
}

interface AuctionHistoryProps {
  history: AuctionResult[];
}

export const AuctionHistory = ({ history }: AuctionHistoryProps) => {
  if (history.length === 0) {
    return (
      <div className="auction-card">
        <h3 className="font-oswald text-xl uppercase tracking-wider text-muted-foreground mb-4">
          Auction History
        </h3>
        <p className="text-muted-foreground text-center py-8">No players auctioned yet</p>
      </div>
    );
  }

  return (
    <div className="auction-card max-h-[400px] overflow-y-auto">
      <h3 className="font-oswald text-xl uppercase tracking-wider text-muted-foreground mb-4 sticky top-0 bg-card pb-2">
        Auction History ({history.length})
      </h3>
      
      <div className="space-y-2">
        {history.map((result, index) => (
          <div
            key={result.player.id}
            className={`flex items-center justify-between p-3 rounded-lg ${
              result.team ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"
            }`}
          >
            <div className="flex items-center gap-3">
              {result.team ? (
                <Trophy className="w-5 h-5 text-success" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              <div>
                <p className="font-medium text-foreground">{result.player.name}</p>
                <p className="text-sm text-muted-foreground">{result.player.category}</p>
              </div>
            </div>
            
            <div className="text-right">
              {result.team ? (
                <>
                  <p className="font-oswald font-bold text-success">₹{result.soldPrice} L</p>
                  <p className="text-xs text-muted-foreground">{result.team.name}</p>
                </>
              ) : (
                <p className="font-oswald font-bold text-destructive">UNSOLD</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
