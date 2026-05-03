namespace Backend.Models;

public class SongRequest
{
    public int Id { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string YoutubeId { get; set; } = string.Empty;
    public string ThumbnailUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsPlayed { get; set; } = false;
}
