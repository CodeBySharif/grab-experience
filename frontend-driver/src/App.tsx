import { useState, useEffect, useCallback, useRef } from 'react';
import { Music, Thermometer, Volume2, AlertTriangle, X, ListMusic, CheckCircle, BellRing } from 'lucide-react';
import * as signalR from '@microsoft/signalr';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.0.143:5164/api';

function App() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [data, setData] = useState<any>(null);
  const [newRequestCount, setNewRequestCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const isExpandedRef = useRef(false);
  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  const fetchCurrentState = useCallback(async () => {
    try {
      const ts = Date.now();
      const [prefRes, songsRes] = await Promise.all([
        fetch(`${API_BASE}/preferences?t=${ts}`),
        fetch(`${API_BASE}/songs?t=${ts}`)
      ]);
      if (prefRes.ok && songsRes.ok) {
        const pref = await prefRes.json();
        const songs = await songsRes.json();
        setData({ preferences: pref, songs: songs });
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  }, []);

  useEffect(() => {
    fetchCurrentState();

    const hubUrl = (API_BASE.replace('/api', '')) + '/notificationHub';
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));

    connection.on("ReceiveNotification", (message) => {
      console.log("Real-time Notification:", message);
      fetchCurrentState();
      
      if (!isExpandedRef.current) {
        setNewRequestCount(prev => prev + 1);
      }
    });

    return () => {
      connection.stop();
    };
  }, [fetchCurrentState]);

  const toggleExpand = () => {
    const nextState = !isExpanded;
    if (nextState) {
      setNewRequestCount(0);
    }
    setIsExpanded(nextState);

    try {
      // @ts-ignore
      if (window.Android) window.Android.resizeWidget(nextState);
    } catch (e) {}
  };

  const markAsPlayed = async (id: number) => {
    try {
      await fetch(`${API_BASE}/songs/${id}/play`, { method: 'PUT' });
      fetchCurrentState();
    } catch (error) {}
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end">
      
      {/* Floating Button */}
      {!isExpanded && (
        <div 
          onClick={toggleExpand}
          className="floating-button bg-[var(--color-grab-green)] hover:scale-105 active:scale-95 transition-all relative"
        >
          <BellRing className={`w-8 h-8 text-white ${newRequestCount > 0 ? 'animate-bounce' : ''}`} />
          {newRequestCount > 0 && (
            <span className="request-badge">{newRequestCount}</span>
          )}
        </div>
      )}

      {/* Expanded Card */}
      {isExpanded && data && (
        <div className="glass expanded-card flex flex-col shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[var(--color-grab-green)]">
              <BellRing className="w-6 h-6" />
              <h2 className="text-xl font-bold">New Requests</h2>
            </div>
            <button 
              onClick={toggleExpand}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar pr-2 max-h-[65vh]">
            {/* Preferences Section */}
            {data.preferences && (
              <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Ride Preferences</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Thermometer className="w-4 h-4" />
                      <span>Temp Level</span>
                    </div>
                    <span className="text-sm font-medium">{data.preferences.tempLevel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Volume2 className="w-4 h-4" />
                      <span>Sound Level</span>
                    </div>
                    <span className="text-sm font-medium">{data.preferences.soundLevel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Urgency</span>
                    </div>
                    <span className="text-sm font-medium capitalize">{data.preferences.urgency}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Songs Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Song Queue</h3>
              {(!data.songs || data.songs.length === 0) ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No songs requested</p>
                </div>
              ) : (
                data.songs.map((song: any) => (
                  <div key={song.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{song.title}</p>
                    </div>
                    <button 
                      onClick={() => markAsPlayed(song.id)}
                      className="ml-2 p-2 bg-[var(--color-grab-green)]/10 hover:bg-[var(--color-grab-green)] rounded-lg text-[var(--color-grab-green)] hover:text-white transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-500">
            <span>GRAB EXPERIENCE</span>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span>{isConnected ? 'LIVE' : 'DISCONNECTED'}</span>
            </div>
          </div>
        </div>
      )}

      {isExpanded && !data && (
        <div className="glass expanded-card flex items-center justify-center py-12">
            <p className="text-gray-400 italic">Connecting to server...</p>
        </div>
      )}
    </div>
  );
}

export default App;
