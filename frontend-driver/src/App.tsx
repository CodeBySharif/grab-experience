import { useState, useEffect, useCallback } from 'react';
import { Music, Thermometer, Volume2, AlertTriangle, X, ListMusic, CheckCircle, BellRing } from 'lucide-react';
import * as signalR from '@microsoft/signalr';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.0.143:5164/api';

function App() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [data, setData] = useState<any>(null);
  const [newRequestCount, setNewRequestCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const fetchCurrentState = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions/current`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setNewRequestCount(result.count);
      }
    } catch (error) {
      console.error("Failed to fetch session state", error);
    }
  }, []);

  useEffect(() => {
    fetchCurrentState();

    // Use the base URL but remove /api if it exists to get the root for Hubs
    const hubUrl = (API_BASE.replace('/api', '')) + '/notificationHub';

    // SignalR Connection
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => {
        setIsConnected(true);
        console.log("Connected to SignalR at", hubUrl);
      })
      .catch(err => console.error("SignalR Connection Error: ", err));

    connection.on("ReceiveNotification", (message) => {
      console.log("Notification received:", message);
      fetchCurrentState();
      
      // Only show badge if NOT already looking at the list
      setData((prev: any) => {
        if (!isExpanded) {
          setNewRequestCount(c => c + 1);
        }
        return prev;
      });
    });

    return () => {
      connection.stop();
    };
  }, [fetchCurrentState, isExpanded]);

  const toggleExpand = () => {
    const nextState = !isExpanded;
    if (nextState) {
      setNewRequestCount(0); // Reset count when opening
    }
    setIsExpanded(nextState);

    // Tell Android to resize the floating window
    try {
      // @ts-ignore
      if (window.Android) {
        // @ts-ignore
        window.Android.resizeWidget(nextState);
      }
    } catch (e) {
      console.log("Not running in Android wrapper");
    }
  };

  const markAsPlayed = async (id: number) => {
    try {
      await fetch(`${API_BASE}/songs/${id}/play`, { method: 'PUT' });
      fetchCurrentState();
    } catch (error) {
      console.error("Failed to mark as played");
    }
  };

  if (!data) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end">
      
      {/* Floating Button */}
      <div 
        onClick={toggleExpand}
        className={`floating-button ${isExpanded ? 'bg-red-500 hover:bg-red-600' : 'bg-[var(--color-grab-green)] hover:bg-[var(--color-grab-green-dark)]'}`}
      >
        {isExpanded ? (
          <X className="w-8 h-8 text-white" />
        ) : (
          <>
            <BellRing className={`w-8 h-8 text-white ${newRequestCount > 0 ? 'animate-bounce' : ''}`} />
            {newRequestCount > 0 && (
              <span className="request-badge">{newRequestCount}</span>
            )}
          </>
        )}
      </div>

      {/* Connection Indicator */}
      <div className={`mt-1 mr-1 w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} title={isConnected ? 'Live' : 'Disconnected'}></div>

      {/* Expanded Request Box */}
      {isExpanded && (
        <div className="expanded-card glass text-white shadow-2xl">
          
          {/* Preferences Summary */}
          <div className="mb-6 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Passenger Preferences</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 p-3 rounded-2xl flex items-center gap-3">
                <Thermometer className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Temp</p>
                  <p className="text-sm font-bold">Lvl {data.preferences?.tempLevel || '-'}</p>
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Volume</p>
                  <p className="text-sm font-bold">Lvl {data.preferences?.soundLevel || '-'}</p>
                </div>
              </div>
            </div>

            {data.preferences?.urgency === 'urgent' && (
              <div className="bg-orange-500/20 border border-orange-500/30 p-3 rounded-2xl flex items-center gap-3 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <p className="text-sm font-bold text-orange-400">Passenger is in a rush!</p>
              </div>
            )}
          </div>

          {/* Song Queue */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[var(--color-grab-green)]" />
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Song Queue</h3>
              </div>
              <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full">{data.queue.length} songs</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {data.queue.length === 0 ? (
                <p className="text-center py-4 text-gray-500 text-sm italic">No pending requests</p>
              ) : (
                data.queue.map((song: any) => (
                  <div key={song.id} className="bg-white/5 p-2 rounded-xl flex items-center gap-3 group hover:bg-white/10 transition-colors">
                    {song.thumbnailUrl ? (
                      <img src={song.thumbnailUrl} className="w-12 h-9 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-9 bg-black/40 rounded-lg flex items-center justify-center">
                        <Music className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" dangerouslySetInnerHTML={{ __html: song.title }}></p>
                      <p className="text-[10px] text-gray-500">YouTube Queue</p>
                    </div>
                    <button 
                      onClick={() => markAsPlayed(song.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white transition-all"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            <button 
              onClick={() => setIsExpanded(false)}
              className="w-full py-2 text-xs font-bold text-gray-500 hover:text-white transition-colors"
            >
              Minimize Widget
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
