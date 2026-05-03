using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<RidePreference> RidePreferences { get; set; }
    public DbSet<SongRequest> SongRequests { get; set; }
}
