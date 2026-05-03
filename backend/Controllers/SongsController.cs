using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Hubs;
using Backend.Services;
using System.Text.Json;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SongsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly YouTubePlaylistManager _youtubePlaylistManager;

    public SongsController(AppDbContext context, IHubContext<NotificationHub> hubContext, IConfiguration configuration, HttpClient httpClient, YouTubePlaylistManager youtubePlaylistManager)
    {
        _context = context;
        _hubContext = hubContext;
        _configuration = configuration;
        _httpClient = httpClient;
        _youtubePlaylistManager = youtubePlaylistManager;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SongRequest>>> GetPendingSongs()
    {
        return await _context.SongRequests
            .Where(r => !r.IsPlayed)
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();
    }

    [HttpPost]
    public async Task<IActionResult> AddSong([FromBody] SongRequest song)
    {
        var activePref = await _context.RidePreferences.OrderByDescending(r => r.UpdatedAt).FirstOrDefaultAsync();
        
        // Wipe if it's a new session.
        if (activePref != null && activePref.SessionId != song.SessionId)
        {
            _context.RidePreferences.RemoveRange(_context.RidePreferences);
            _context.SongRequests.RemoveRange(_context.SongRequests);
            await _context.SaveChangesAsync();
            
            _context.RidePreferences.Add(new RidePreference { SessionId = song.SessionId });
            await _context.SaveChangesAsync();
        }

        // Reject duplicate: same video already in the current queue
        var duplicate = await _context.SongRequests
            .AnyAsync(s => s.YoutubeId == song.YoutubeId && !s.IsPlayed);
        if (duplicate)
            return Conflict(new { status = "duplicate", message = "This song is already in the queue." });

        _context.SongRequests.Add(song);
        await _context.SaveChangesAsync();

        try 
        {
            if (activePref != null && activePref.SessionId != song.SessionId)
            {
                // Clear YouTube playlist for new session
                await _youtubePlaylistManager.ClearPlaylistAsync();
            }

            // Add to actual YouTube Playlist
            await _youtubePlaylistManager.AddToPlaylistAsync(song.YoutubeId);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[YouTube Sync Error] {ex.Message}");
        }

        await _hubContext.Clients.All.SendAsync("ReceiveNotification", "New song added");
        return Ok(new { status = "ok", message = "Song added to playlist locally (YouTube sync may have failed)" });
    }
    
    [HttpPut("{id}/play")]
    public async Task<IActionResult> MarkSongAsPlayed(int id)
    {
        var song = await _context.SongRequests.FindAsync(id);
        if (song == null) return NotFound();

        song.IsPlayed = true;
        await _context.SaveChangesAsync();
        await _hubContext.Clients.All.SendAsync("ReceiveNotification", "Song marked as played");
        return Ok(new { status = "ok", message = "Song marked as played" });
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchYouTube([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return BadRequest("Query cannot be empty");

        var apiKey = _configuration["YouTubeApiKey"];
        if (string.IsNullOrEmpty(apiKey)) 
        {
            // Mock response if no API key is configured
            return Ok(new[] {
                new { videoId = "mock123", title = $"Mock: {query} - Official Video", channelTitle = "Mock Channel", thumbnailUrl = "https://via.placeholder.com/120x90" },
                new { videoId = "mock456", title = $"Mock: {query} - Live Performance", channelTitle = "Mock Channel", thumbnailUrl = "https://via.placeholder.com/120x90" }
            });
        }

        var url = $"https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q={Uri.EscapeDataString(query)}&type=video&key={apiKey}";
        
        var response = await _httpClient.GetAsync(url);
        if (!response.IsSuccessStatusCode) return StatusCode((int)response.StatusCode, "Error querying YouTube");

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement.GetProperty("items").EnumerateArray();

        var results = new List<object>();
        foreach (var item in items)
        {
            var id = item.GetProperty("id").GetProperty("videoId").GetString();
            var snippet = item.GetProperty("snippet");
            var title = snippet.GetProperty("title").GetString();
            var channel = snippet.GetProperty("channelTitle").GetString();
            var thumb = snippet.GetProperty("thumbnails").GetProperty("default").GetProperty("url").GetString();

            results.Add(new { videoId = id, title, channelTitle = channel, thumbnailUrl = thumb });
        }


        return Ok(results);
    }
}
