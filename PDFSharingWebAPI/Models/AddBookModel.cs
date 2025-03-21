namespace PDFSharingWebAPI.Models;

public class AddBookRequest
{
    public required String Name { get; set; }
    public String? Description { get; set; }
    public required IFormFile FileData { get; set; }
}

public class AddBookResponse
{
    public required String Result { get; set; }
    public String? Message { get; set; }
}
