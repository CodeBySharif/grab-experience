using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Services;
using Google.Apis.YouTube.v3;
using Google.Apis.YouTube.v3.Data;

namespace Backend.Services;

public class YouTubePlaylistManager
{
    private readonly YouTubeService _youtubeService;
    private string _playlistId; 

    public YouTubePlaylistManager(IConfiguration configuration)
    {
        var clientId = configuration["YouTubeOAuth:ClientId"];
        var clientSecret = configuration["YouTubeOAuth:ClientSecret"];
        var refreshToken = configuration["YouTubeOAuth:RefreshToken"];

        var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = new ClientSecrets
            {
                ClientId = clientId,
                ClientSecret = clientSecret
            },
            Scopes = new[] { YouTubeService.Scope.Youtube }
        });

        var token = new TokenResponse { RefreshToken = refreshToken };
        var credential = new UserCredential(flow, "user", token);

        _youtubeService = new YouTubeService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "GrabService PWA"
        });
        
        _playlistId = configuration["YouTubeOAuth:PlaylistId"] ?? "";
    }

    public async Task<string> GetOrCreatePlaylistAsync()
    {
        if (!string.IsNullOrEmpty(_playlistId)) return _playlistId;

        // Search for existing GrabExperience Queue
        var request = _youtubeService.Playlists.List("snippet");
        request.Mine = true;
        var response = await request.ExecuteAsync();

        var existing = response.Items.FirstOrDefault(p => p.Snippet.Title == "GrabExperience Queue");
        if (existing != null)
        {
            _playlistId = existing.Id;
            return _playlistId;
        }

        // Create new
        var newPlaylist = new Playlist
        {
            Snippet = new PlaylistSnippet
            {
                Title = "GrabExperience Queue",
                Description = "Auto-generated playlist for Grab passenger requests."
            },
            Status = new PlaylistStatus
            {
                PrivacyStatus = "private"
            }
        };

        var createRequest = _youtubeService.Playlists.Insert(newPlaylist, "snippet,status");
        var created = await createRequest.ExecuteAsync();
        _playlistId = created.Id;
        return _playlistId;
    }

    public async Task ClearPlaylistAsync()
    {
        try 
        {
            var playlistId = await GetOrCreatePlaylistAsync();
            if (!string.IsNullOrEmpty(playlistId))
            {
                var deleteRequest = _youtubeService.Playlists.Delete(playlistId);
                await deleteRequest.ExecuteAsync();
                _playlistId = ""; // Reset cached ID so it gets recreated on next call
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to clear/delete playlist: {ex.Message}");
            _playlistId = ""; // Still reset cached ID to be safe
        }
    }

    public async Task AddToPlaylistAsync(string videoId)
    {
        var playlistId = await GetOrCreatePlaylistAsync();

        var playlistItem = new PlaylistItem
        {
            Snippet = new PlaylistItemSnippet
            {
                PlaylistId = playlistId,
                ResourceId = new ResourceId
                {
                    Kind = "youtube#video",
                    VideoId = videoId
                }
            }
        };

        try 
        {
            var request = _youtubeService.PlaylistItems.Insert(playlistItem, "snippet");
            await request.ExecuteAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to add to playlist: {ex.Message}");
        }
    }
}
