// import { Button } from "@/components/ui/button";
// import { Check, X, SkipForward, Play, Pause } from "lucide-react";

// interface AuctionControlsProps {
//   onSold: () => void;
//   onUnsold: () => void;
//   onNext: () => void;
//   onToggleTimer: () => void;
//   isTimerRunning: boolean;
//   canSell: boolean;
//   hasMorePlayers: boolean;
// }

// export const AuctionControls = ({
//   onSold,
//   onUnsold,
//   onNext,
//   onToggleTimer,
//   isTimerRunning,
//   canSell,
//   hasMorePlayers,
// }: AuctionControlsProps) => {
//   return (
//     <div className="auction-card">
//       <h3 className="font-oswald text-xl uppercase tracking-wider text-muted-foreground mb-4">
//         Auction Controls
//       </h3>
      
//       <div className="grid grid-cols-2 gap-4">
//         <Button
//           onClick={onSold}
//           disabled={!canSell}
//           variant="success"
//           className="h-16 font-oswald text-xl uppercase tracking-wider"
//         >
//           <Check className="w-6 h-6 mr-2" />
//           SOLD
//         </Button>
        
//         <Button
//           onClick={onUnsold}
//           variant="destructive"
//           className="h-16 font-oswald text-xl uppercase tracking-wider"
//         >
//           <X className="w-6 h-6 mr-2" />
//           UNSOLD
//         </Button>
        
//         <Button
//           onClick={onToggleTimer}
//           variant="outline"
//           className="h-12 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-oswald uppercase tracking-wider"
//         >
//           {isTimerRunning ? (
//             <>
//               <Pause className="w-5 h-5 mr-2" />
//               PAUSE
//             </>
//           ) : (
//             <>
//               <Play className="w-5 h-5 mr-2" />
//               START
//             </>
//           )}
//         </Button>
        
//         <Button
//           onClick={onNext}
//           disabled={!hasMorePlayers}
//           variant="outline"
//           className="h-12 border-accent text-accent hover:bg-accent hover:text-accent-foreground font-oswald uppercase tracking-wider disabled:opacity-50"
//         >
//           <SkipForward className="w-5 h-5 mr-2" />
//           NEXT
//         </Button>
//       </div>
//     </div>
//   );
// };






import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, SkipForward, Play, Pause } from "lucide-react";

let connectSocket: ((url?: string) => any) | undefined;
let getSocket: (() => any) | undefined;

interface AuctionControlsProps {
  onSold: () => void;
  onUnsold: () => void;
  onNext: () => void;
  onToggleTimer: () => void;
  isTimerRunning: boolean;
  canSell: boolean;
  hasMorePlayers: boolean;
  auctionId?: string;
  userId?: string;
}

export const AuctionControls = ({
  onSold,
  onUnsold,
  onNext,
  onToggleTimer,
  isTimerRunning,
  canSell,
  hasMorePlayers,
  auctionId,
  userId,
}: AuctionControlsProps) => {
  useEffect(() => {
    // dynamically import the socket helper; try alias first then relative path
    (async () => {
      try {
        const mod = await import('@/lib/socket');
        connectSocket = mod.connectSocket;
        getSocket = mod.getSocket;
      } catch (e1) {
        try {
          const mod = await import('../lib/socket');
          connectSocket = mod.connectSocket;
          getSocket = mod.getSocket;
        } catch (e2) {
          // socket helper not present — that's fine, component still works
          connectSocket = undefined;
          getSocket = undefined;
        }
      }

      if (connectSocket) {
        try {
          connectSocket(); // trigger connection (will log if your helper does)
        } catch {
          /* ignore */
        }
      }
    })();

    // no cleanup required (socket helper manages singleton)
  }, []);

  const emitIfConnected = (event: string, payload: Record<string, any> = {}) => {
    if (!getSocket) return;
    try {
      const sock = getSocket();
      const aid =
        auctionId ??
        (typeof window !== "undefined"
          ? (window as any).auctionId ?? localStorage.getItem("auctionId")
          : null);
      const uid =
        userId ??
        (typeof window !== "undefined"
          ? (window as any).userId ?? localStorage.getItem("userId")
          : null);
      const data = { auctionId: aid, userId: uid, ...payload };
      sock.emit(event, data);
    } catch {
      // silent fail; keep UI callbacks primary
    }
  };

  const handleSold = () => {
    onSold();
    emitIfConnected("sell", {});
  };

  const handleUnsold = () => {
    onUnsold();
    emitIfConnected("unsold", {});
  };

  const handleToggleTimer = () => {
    onToggleTimer();
    emitIfConnected("toggleTimer", { isTimerRunning: !isTimerRunning });
  };

  const handleNext = () => {
    onNext();
    emitIfConnected("nextPlayer", {});
  };

  return (
    <div className="auction-card">
      <h3 className="font-oswald text-xl uppercase tracking-wider text-muted-foreground mb-4">
        Auction Controls
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={handleSold}
          disabled={!canSell}
          variant="success"
          className="h-16 font-oswald text-xl uppercase tracking-wider"
        >
          <Check className="w-6 h-6 mr-2" />
          SOLD
        </Button>

        <Button
          onClick={handleUnsold}
          variant="destructive"
          className="h-16 font-oswald text-xl uppercase tracking-wider"
        >
          <X className="w-6 h-6 mr-2" />
          UNSOLD
        </Button>

        <Button
          onClick={handleToggleTimer}
          variant="outline"
          className="h-12 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-oswald uppercase tracking-wider"
        >
          {isTimerRunning ? (
            <>
              <Pause className="w-5 h-5 mr-2" />
              PAUSE
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              START
            </>
          )}
        </Button>

        <Button
          onClick={handleNext}
          disabled={!hasMorePlayers}
          variant="outline"
          className="h-12 border-accent text-accent hover:bg-accent hover:text-accent-foreground font-oswald uppercase tracking-wider disabled:opacity-50"
        >
          <SkipForward className="w-5 h-5 mr-2" />
          NEXT
        </Button>
      </div>
    </div>
  );
};

export default AuctionControls;
