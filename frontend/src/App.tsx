import { useState, useEffect } from 'react';
import { Thermometer, Volume2, AlertTriangle, Music, Loader2, CheckCircle, Search, PlayCircle, ListMusic } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.0.143:5164/api';

function App() {
  const [sessionId, setSessionId] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Preferences State
  const [tempLevel, setTempLevel] = useState(4);
  const [soundLevel, setSoundLevel] = useState(10);
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [isSubmittingPrefs, setIsSubmittingPrefs] = useState(false);

  // Song Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSubmittingSong, setIsSubmittingSong] = useState(false);
  
  // Playlist State
  const [playlist, setPlaylist] = useState<any[]>([]);

  useEffect(() => {
    // Session Management - use manual UUID for HTTP compatibility on mobile
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    let storedSession = sessionStorage.getItem('rideSessionId');
    if (!storedSession) {
      storedSession = generateUUID();
      sessionStorage.setItem('rideSessionId', storedSession);
    }
    setSessionId(storedSession);
    
    // Register session with backend — triggers immediate wipe if new passenger
    const registerSession = async (sid: string) => {
      try {
        const res = await fetch(`${API_BASE}/sessions/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sid }),
        });
        const data = await res.json();
        if (data.isNewSession) {
          // New passenger — clear local playlist immediately
          setPlaylist([]);
        } else {
          // Same session — load existing playlist
          fetchPlaylist();
        }
      } catch {
        // Fallback: just load playlist
        fetchPlaylist();
      }
    };

    registerSession(storedSession);
  }, []);

  const fetchPlaylist = async () => {
    try {
      const response = await fetch(`${API_BASE}/songs`);
      if (response.ok) {
        const data = await response.json();
        setPlaylist(data);
      }
    } catch (error) {
      console.error("Failed to fetch playlist");
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const submitPreferences = async () => {
    setIsSubmittingPrefs(true);
    try {
      const response = await fetch(`${API_BASE}/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          tempLevel,
          soundLevel,
          urgency
        }),
      });

      if (!response.ok) throw new Error('Failed to update preferences');
      showNotification('Ride preferences updated!', 'success');
    } catch (error) {
      showNotification('Failed to update preferences.', 'error');
    } finally {
      setIsSubmittingPrefs(false);
    }
  };

  const searchSongs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE}/songs/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      showNotification('Failed to search songs.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const requestSpecificSong = async (song: any) => {
    setIsSubmittingSong(true);
    try {
      const response = await fetch(`${API_BASE}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          title: song.title, 
          youtubeId: song.videoId,
          thumbnailUrl: song.thumbnailUrl
        }),
      });

      if (response.status === 409) {
        showNotification('Already in queue!', 'error');
        return;
      }
      if (!response.ok) throw new Error('Failed to request song');
      showNotification('Song added to playlist!', 'success');
      setSearchQuery('');
      setSearchResults([]);
      
      // Refresh the playlist to show the newly added song
      fetchPlaylist();
    } catch (error) {
      showNotification('Failed to request song.', 'error');
    } finally {
      setIsSubmittingSong(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-grab-dark)] text-white p-4 font-sans selection:bg-[var(--color-grab-green)] selection:text-white pb-24">
      
      {/* Header */}
      <header className="py-4 mb-4">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[var(--color-grab-green)] to-emerald-400 bg-clip-text text-transparent">
          GrabExperience
        </h1>
        <p className="text-gray-400 text-sm mt-1">Customize your ride experience</p>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg glass flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300 ${notification.type === 'success' ? 'border-[var(--color-grab-green)] text-[var(--color-grab-green)]' : 'border-red-500 text-red-400'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-medium text-white">{notification.message}</span>
        </div>
      )}

      <main className="space-y-6">

        {/* SONG SEARCH SECTION */}
        <section className="glass-card p-5 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Request a Song</h2>
              <p className="text-xs text-gray-400">Search YouTube directly</p>
            </div>
          </div>

          <form onSubmit={searchSongs} className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artist or song..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 pr-14 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
            />
            <button 
              type="submit" 
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2 top-2 bottom-2 aspect-square bg-white/10 rounded-xl flex items-center justify-center text-white disabled:opacity-50 hover:bg-white/20 transition-colors"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3 mt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Top Results</p>
              {searchResults.map((song, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center gap-3 bg-black/20 p-2 rounded-xl transition-colors group cursor-pointer ${isSubmittingSong ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:bg-white/5'}`}
                  onClick={() => !isSubmittingSong && requestSpecificSong(song)}
                >
                  <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0">
                    <img src={song.thumbnailUrl} alt={song.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold truncate" dangerouslySetInnerHTML={{ __html: song.title }}></h4>
                    <p className="text-xs text-gray-400 truncate">{song.channelTitle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Current Playlist Queue */}
          {playlist.length > 0 && searchResults.length === 0 && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2 mb-3 text-purple-400">
                <ListMusic className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-wider">In Queue</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {playlist.map((song) => (
                  <div key={song.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg">
                    {song.thumbnailUrl ? (
                      <img src={song.thumbnailUrl} alt={song.title} className="w-10 h-8 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-8 bg-gray-800 rounded flex items-center justify-center">
                        <Music className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    <p className="text-sm font-medium truncate flex-1" dangerouslySetInnerHTML={{ __html: song.title }}></p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>


        {/* PREFERENCES SECTION */}
        <section className="glass-card p-5 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--color-grab-green)] to-emerald-400"></div>

          <div className="mb-6">
            <h2 className="text-xl font-bold">Ride Preferences</h2>
            <p className="text-xs text-gray-400 mt-1">Set your ideal environment</p>
          </div>

          {/* Temperature */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">Temperature</span>
              </div>
              <span className="text-xs font-bold bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md">
                Level {tempLevel}
              </span>
            </div>
            <input 
              type="range" 
              min="1" max="8" 
              value={tempLevel} 
              onChange={(e) => setTempLevel(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
              <span>Warmer</span>
              <span>Colder</span>
            </div>
          </div>

          {/* Sound */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">Radio Volume</span>
              </div>
              <span className="text-xs font-bold bg-purple-500/20 text-purple-400 px-2 py-1 rounded-md">
                Level {soundLevel}
              </span>
            </div>
            <input 
              type="range" 
              min="1" max="20" 
              value={soundLevel} 
              onChange={(e) => setSoundLevel(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
              <span>Quiet</span>
              <span>Loud</span>
            </div>
          </div>

          {/* Urgency */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium">Pacing</span>
            </div>
            <div className="flex p-1 bg-black/40 rounded-xl">
              <button 
                onClick={() => setUrgency('normal')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${urgency === 'normal' ? 'bg-white/10 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Normal
              </button>
              <button 
                onClick={() => setUrgency('urgent')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${urgency === 'urgent' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                I'm in a rush
              </button>
            </div>
          </div>

          <button 
            onClick={submitPreferences}
            disabled={isSubmittingPrefs}
            className="w-full bg-[var(--color-grab-green)] hover:bg-[var(--color-grab-green-dark)] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-[var(--color-grab-green)]/20 flex items-center justify-center gap-2"
          >
            {isSubmittingPrefs ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Update Preferences
          </button>

        </section>

      </main>
    </div>
  );
}

export default App;
