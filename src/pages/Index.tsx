import { useState, useEffect, useCallback } from "react";
import { players, initialTeams, Player, Team } from "@/data/players";
import { PlayerCard } from "@/components/PlayerCard";
import { AuctionTimer } from "@/components/AuctionTimer";
import { TeamPanel } from "@/components/TeamPanel";
import { AuctionControls } from "@/components/AuctionControls";
import { AuctionHistory } from "@/components/AuctionHistory";
import { Gavel, Trophy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { connectSocket, getSocket } from "@/lib/socket";

/**
 * Note: This file adds realtime behaviour on top of your existing auction logic.
 * The server is expected to broadcast:
 *  - 'bidAccepted' { auctionId, highest: { bidderId, amount, ts } }
 *  - 'controlEvent' { type: 'sold'|'unsold'|'toggleTimer'|'nextPlayer', auctionId, winner?, by?, isTimerRunning? }
 */

interface AuctionResult {
  player: Player;
  team: Team | null;
  soldPrice: number | null;
}

const Index = () => {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentBid, setCurrentBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState<{ teamId: number; teamName: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [history, setHistory] = useState<AuctionResult[]>([]);
  const [isAuctionComplete, setIsAuctionComplete] = useState(false);

  const currentPlayer = players[currentPlayerIndex];

  // Reset for new player
  useEffect(() => {
    if (currentPlayer) {
      setCurrentBid(currentPlayer.basePrice);
      setHighestBidder(null);
      setTimeLeft(15);
      setIsTimerRunning(false);
    }
  }, [currentPlayerIndex, currentPlayer]);

  // Timer countdown
  useEffect(() => {
    if (!isTimerRunning || timeLeft === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  // SOCKET: connect and join on mount
  useEffect(() => {
    const sock = connectSocket();

    const auctionId = "1";
    let userId = localStorage.getItem("userId");
    if (!userId) {
      userId = "user_" + Math.random().toString(36).slice(2, 8);
      localStorage.setItem("userId", userId);
    }

    // join room and ask for state (server will respond with state if implemented)
    sock.emit("join", { auctionId, userId, purse: 5000 });

    // handle server state if provided (best-effort)
    sock.on("state", (p: any) => {
      try {
        // if server sends a matching shape, apply minimal fields
        if (p?.state) {
          const s = p.state;
          // We only apply highest & maybe other simple pieces — keep local authoritative for teams
          if (s.highest) {
            setCurrentBid(Number(s.highest.amount || 0));
            setHighestBidder((_) =>
              s.highest.bidderId ? { teamId: Number(s.highest.bidderId), teamName: String(s.highest.bidderId) } : null
            );
          }
        }
      } catch {}
    });

    // When server accepts a bid, update bid + highest bidder
    sock.on("bidAccepted", (payload: any) => {
      try {
        const highest = payload?.highest;
        if (!highest) return;
        const bidderIdNum = Number(highest.bidderId);
        const bidderTeam = teams.find((t) => t.id === bidderIdNum);
        setCurrentBid(Number(highest.amount));
        setHighestBidder(bidderTeam ? { teamId: bidderTeam.id, teamName: bidderTeam.name } : { teamId: bidderIdNum, teamName: String(highest.bidderId) });
        // restart timer locally (mirror sender behavior)
        setTimeLeft(15);
        setIsTimerRunning(true);
      } catch (e) {}
    });

    // Generic control events
    sock.on("controlEvent", (ev: any) => {
      if (!ev || typeof ev.type !== "string") return;
      const type = ev.type;

      if (type === "sold") {
        // server may provide winner info: ev.winner = { bidderId, amount }
        if (ev.winner) {
          const bidderIdNum = Number(ev.winner.bidderId);
          applySoldRemote(bidderIdNum, Number(ev.winner.amount));
        } else {
          // fallback: if we locally have highest bidder, finalize it
          if (highestBidder) {
            handleSoldLocal(); // fallback local
          }
        }
      } else if (type === "unsold") {
        applyUnsoldRemote();
      } else if (type === "toggleTimer") {
        if (typeof ev.isTimerRunning === "boolean") setIsTimerRunning(Boolean(ev.isTimerRunning));
      } else if (type === "nextPlayer") {
        // move to next player
        moveToNextPlayer();
      }
    });

    // cleanup
    return () => {
      try {
        const s = getSocket();
        s.off("state");
        s.off("bidAccepted");
        s.off("controlEvent");
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // Helpers to update teams/history (functional to avoid stale closures)
  const applySoldRemote = (teamId: number, soldAmount: number) => {
    if (!currentPlayer) return;
    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId ? { ...team, budget: team.budget - soldAmount, players: [...team.players, currentPlayer] } : team
      )
    );

    setHistory((prev) => [{ player: currentPlayer, team: teams.find((t) => t.id === teamId) ?? null, soldPrice: soldAmount }, ...prev]);

    toast({
      title: "SOLD (remote)",
      description: `${currentPlayer.name} sold to ${teams.find((t) => t.id === teamId)?.name || teamId} for ₹${soldAmount} Lakhs!`,
    });

    // proceed
    moveToNextPlayer();
  };

  const applyUnsoldRemote = () => {
    if (!currentPlayer) return;
    setHistory((prev) => [{ player: currentPlayer, team: null, soldPrice: null }, ...prev]);
    toast({ title: "UNSOLD (remote)", description: `${currentPlayer.name} remains unsold`, variant: "destructive" });
    moveToNextPlayer();
  };

  // Local bid handler — also emits to server
  const handleBid = useCallback((teamId: number) => {
  const team = teams.find((t) => t.id === teamId);
  if (!team || !currentPlayer) return;

  const newBid = currentBid + 10;
  if (team.budget < newBid) {
    toast({
      title: "Insufficient Budget",
      description: `${team.name} cannot afford this bid!`,
      variant: "destructive",
    });
    return;
  }

  // local update
  setCurrentBid(newBid);
  setHighestBidder({ teamId, teamName: team.name });
  setTimeLeft(15);
  setIsTimerRunning(true);

  // notify server
  try {
    getSocket().emit("placeBid", {
      auctionId: "1",
      bidderId: "teamId",
      amount: newBid
    });
  } catch {}

  toast({
    title: "New Bid!",
    description: `${team.name} bids ₹${newBid} Lakhs`,
  });
}, [currentBid, teams, currentPlayer]);


  // Local sold action (triggered by controlling user)
  const handleSoldLocal = useCallback(() => {
    if (!highestBidder || !currentPlayer) return;

    const soldTeamId = highestBidder.teamId;
    const soldAmount = currentBid;

    // update teams and history
    setTeams((prevTeams) =>
      prevTeams.map((team) =>
        team.id === soldTeamId
          ? {
              ...team,
              budget: team.budget - soldAmount,
              players: [...team.players, currentPlayer],
            }
          : team
      )
    );

    const buyingTeam = teams.find((t) => t.id === soldTeamId);
    setHistory((prev) => [
      { player: currentPlayer, team: buyingTeam ?? null, soldPrice: soldAmount },
      ...prev,
    ]);

    toast({
      title: "SOLD!",
      description: `${currentPlayer.name} sold to ${highestBidder.teamName} for ₹${soldAmount} Lakhs!`,
    });

    // tell other clients
    try {
      getSocket().emit("sell", { auctionId: "1", userId: localStorage.getItem("userId"), /* server will broadcast winner if it has state */ });
    } catch {}

    moveToNextPlayer();
  }, [highestBidder, currentPlayer, currentBid, teams]);

  const handleUnsoldLocal = useCallback(() => {
    if (!currentPlayer) return;

    setHistory((prev) => [
      { player: currentPlayer, team: null, soldPrice: null },
      ...prev,
    ]);

    toast({
      title: "UNSOLD",
      description: `${currentPlayer.name} remains unsold`,
      variant: "destructive",
    });

    try {
      getSocket().emit("unsold", { auctionId: "1", userId: localStorage.getItem("userId") });
    } catch {}

    moveToNextPlayer();
  }, [currentPlayer]);

  const moveToNextPlayer = useCallback(() => {
    setIsTimerRunning(false);
    setHighestBidder(null);
    setCurrentBid(0);
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex((prev) => prev + 1);
    } else {
      setIsAuctionComplete(true);
    }
  }, [currentPlayerIndex]);

  const handleTimeUp = useCallback(() => {
    setIsTimerRunning(false);
    if (highestBidder) {
      // finalize as sold
      handleSoldLocal();
    } else {
      // mark unsold
      handleUnsoldLocal();
    }
  }, [highestBidder, handleSoldLocal, handleUnsoldLocal]);

  const handleToggleTimerLocal = useCallback(() => {
    setIsTimerRunning((prev) => !prev);
    try {
      getSocket().emit("toggleTimer", { auctionId: "1", userId: localStorage.getItem("userId"), isTimerRunning: !isTimerRunning });
    } catch {}
  }, [isTimerRunning]);

  // If a remote 'bidAccepted' arrives, we've handled it above in socket listener.
  // If a remote 'sold' arrives we applySoldRemote.
  // If remote 'unsold' arrives applyUnsoldRemote.

  if (isAuctionComplete) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Trophy className="w-20 h-20 text-primary mx-auto mb-4" />
            <h1 className="font-oswald text-5xl font-bold text-foreground uppercase tracking-wider">
              Auction Complete!
            </h1>
            <p className="text-muted-foreground mt-2">All players have been auctioned</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="auction-card border-t-4 border-t-primary"
              >
                <h3 className="font-oswald text-xl font-bold text-foreground">{team.name}</h3>
                <p className="text-primary font-oswald text-lg">₹{(team.budget / 100).toFixed(1)} Cr remaining</p>
                <div className="mt-4 space-y-2">
                  {team.players.length > 0 ? (
                    team.players.map((player) => (
                      <div key={player.id} className="text-sm text-muted-foreground">
                        {player.name}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No players</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <Gavel className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-oswald text-2xl font-bold text-foreground uppercase tracking-wider">
                IPL Auction 2024
              </h1>
              <p className="text-sm text-muted-foreground">
                Player {currentPlayerIndex + 1} of {players.length}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Players Sold</p>
            <p className="font-oswald text-2xl font-bold text-primary">
              {history.filter((h) => h.team !== null).length}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Player & Timer */}
          <div className="lg:col-span-2 space-y-6">
            {currentPlayer && (
              <PlayerCard
                player={currentPlayer}
                currentBid={currentBid}
                highestBidder={highestBidder?.teamName || null}
                playerNumber={currentPlayerIndex + 1}
                totalPlayers={players.length}
              />
            )}

            <AuctionTimer
              timeLeft={timeLeft}
              isRunning={isTimerRunning}
              onTimeUp={handleTimeUp}
            />

            <AuctionControls
              onSold={handleSoldLocal}
              onUnsold={handleUnsoldLocal}
              onNext={() => {
                try { getSocket().emit("nextPlayer", { auctionId: "1", userId: localStorage.getItem("userId") }); } catch {}
                moveToNextPlayer();
              }}
              onToggleTimer={handleToggleTimerLocal}
              isTimerRunning={isTimerRunning}
              canSell={!!highestBidder}
              hasMorePlayers={currentPlayerIndex < players.length - 1}
              auctionId="1"
              userId={localStorage.getItem("userId") || "unknown"}
            />
          </div>

          {/* Right Column - Teams & History */}
          <div className="space-y-6">
            <div className="auction-card">
              <TeamPanel
                teams={teams}
                onBid={handleBid}
                onUpdateTeamName={(id, name) => {
                  setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, name, shortName: name.substring(0, 3).toUpperCase() } : t)));
                }}
                onUpdateTeamColor={(id, color) => setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)))}
                currentBid={currentBid}
                canBid={isTimerRunning || !highestBidder}
              />
            </div>

            <AuctionHistory history={history} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
