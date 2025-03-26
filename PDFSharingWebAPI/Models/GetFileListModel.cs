namespace PDFSharingWebAPI.Models;

public class PdfFileInfo
{
    public required string FileName { get; set; }
    public string? Description { get; set; }
    public DateTime CreationTime { get; set; }
}

