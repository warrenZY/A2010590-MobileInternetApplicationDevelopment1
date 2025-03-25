namespace PDFSharingWebAPI.Models;

public class RmvBookRequest
{
    public required string FileName { get; set; }
}

public class RmvBookResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
}
