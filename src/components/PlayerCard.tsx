import { Player } from "@/data/players";
import { Trophy, Star } from "lucide-react";

interface PlayerCardProps {
  player: Player;
  currentBid: number;
  highestBidder: string | null;
  playerNumber: number;
  totalPlayers: number;
}

const categoryColors: Record<string, string> = {
  Batsman: "bg-primary text-primary-foreground",
  Bowler: "bg-success text-success-foreground",
  "All Rounder": "bg-accent text-accent-foreground",
  "Wicket Keeper": "bg-destructive text-destructive-foreground",
};

export const PlayerCard = ({ player, currentBid, highestBidder, playerNumber, totalPlayers }: PlayerCardProps) => {
  return (
    <div className="auction-card animate-slide-in">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
      
      <div className="text-center space-y-6">
        {/* Player Number */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <span className="text-sm">Player {playerNumber} of {totalPlayers}</span>
        </div>

        {/* Player Name */}
        <div>
          <h2 className="font-oswald text-5xl md:text-6xl font-bold text-foreground uppercase tracking-wide">
            {player.name}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className={`player-badge ${categoryColors[player.category]}`}>
              {player.category}
            </span>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${i < Math.floor(player.rating / 2) ? "text-yellow-500 fill-yellow-500" : "text-muted"}`}
            />
          ))}
        </div>

        {/* Price Section */}
        <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
          <div className="bg-secondary rounded-xl p-6 border border-border">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Base Price</p>
            <p className="price-tag text-4xl">₹{player.basePrice} L</p>
          </div>
          <div className="bg-primary/5 rounded-xl p-6 border-2 border-primary">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Current Bid</p>
            <p className="font-oswald text-4xl font-bold text-primary">₹{currentBid} L</p>
          </div>
        </div>

        {/* Highest Bidder */}
        {highestBidder && (
          <div className="flex items-center justify-center gap-2 bg-success/10 border border-success/30 rounded-xl p-4 max-w-md mx-auto">
            <Trophy className="w-6 h-6 text-success" />
            <span className="text-success font-bold text-lg">Highest Bidder: {highestBidder}</span>
          </div>
        )}
      </div>
    </div>
  );
};
