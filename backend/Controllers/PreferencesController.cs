using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Hubs;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PreferencesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;

    public PreferencesController(AppDbContext context, IHubContext<NotificationHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<ActionResult<RidePreference>> GetCurrentPreference()
    {
        var pref = await _context.RidePreferences.OrderByDescending(r => r.UpdatedAt).FirstOrDefaultAsync();
        if (pref == null) return NotFound();
        return pref;
    }

    [HttpPost]
    public async Task<IActionResult> UpsertPreference([FromBody] RidePreference request)
    {
        var activePref = await _context.RidePreferences.OrderByDescending(r => r.UpdatedAt).FirstOrDefaultAsync();

        // If it's a new session, wipe the slate clean
        if (activePref != null && activePref.SessionId != request.SessionId)
        {
            _context.RidePreferences.RemoveRange(_context.RidePreferences);
            _context.SongRequests.RemoveRange(_context.SongRequests);
            await _context.SaveChangesAsync();
            
            // It's a clean slate now
            _context.RidePreferences.Add(request);
        }
        else if (activePref != null && activePref.SessionId == request.SessionId)
        {
            // Update existing preference for this session
            activePref.TempLevel = request.TempLevel;
            activePref.SoundLevel = request.SoundLevel;
            activePref.Urgency = request.Urgency;
            activePref.UpdatedAt = DateTime.UtcNow;
            _context.RidePreferences.Update(activePref);
        }
        else
        {
            // First time ever
            _context.RidePreferences.Add(request);
        }

        await _context.SaveChangesAsync();

        // Notify Driver App via SignalR
        await _hubContext.Clients.All.SendAsync("ReceiveNotification", "Ride preferences updated");

        return Ok(new { status = "ok", message = "Preferences saved" });
    }
}
