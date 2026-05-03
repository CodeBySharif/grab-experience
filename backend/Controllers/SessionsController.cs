using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Hubs;
using Backend.Services;
using Backend.Models;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SessionsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly YouTubePlaylistManager _youtubePlaylistManager;

    public SessionsController(AppDbContext context, IHubContext<NotificationHub> hubContext, YouTubePlaylistManager youtubePlaylistManager)
    {
        _context = context;
        _hubContext = hubContext;
        _youtubePlaylistManager = youtubePlaylistManager;
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartSession([FromBody] StartSessionRequest request)
    {
        var activePref = await _context.RidePreferences
            .OrderByDescending(r => r.UpdatedAt)
            .FirstOrDefaultAsync();

        bool isNewSession = activePref == null || activePref.SessionId != request.SessionId;

        if (isNewSession)
        {
            if (activePref != null)
            {
                // Wipe all old data immediately on new session scan
                _context.RidePreferences.RemoveRange(_context.RidePreferences);
                _context.SongRequests.RemoveRange(_context.SongRequests);
                await _context.SaveChangesAsync();

                // Clear actual YouTube playlist too
                try
                {
                    await _youtubePlaylistManager.ClearPlaylistAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[YouTube Sync Error on session start] {ex.Message}");
                }

                await _hubContext.Clients.All.SendAsync("ReceiveNotification", "New passenger - session reset");
            }

            // Record the new session ID so subsequent checks know it's the current one
            _context.RidePreferences.Add(new RidePreference { 
                SessionId = request.SessionId,
                UpdatedAt = DateTime.UtcNow 
            });
            await _context.SaveChangesAsync();
        }

        return Ok(new { isNewSession, sessionId = request.SessionId });
    }
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentSession()
    {
        var activePref = await _context.RidePreferences
            .OrderByDescending(r => r.UpdatedAt)
            .FirstOrDefaultAsync();

        var pendingSongs = await _context.SongRequests
            .Where(r => !r.IsPlayed)
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();

        return Ok(new 
        { 
            preferences = activePref, 
            queue = pendingSongs,
            count = pendingSongs.Count 
        });
    }
}

public class StartSessionRequest
{
    public string SessionId { get; set; } = string.Empty;
}
