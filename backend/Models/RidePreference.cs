namespace Backend.Models;

public class RidePreference
{
    public int Id { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public int TempLevel { get; set; } = 4;
    public int SoundLevel { get; set; } = 10;
    public string Urgency { get; set; } = "normal";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
