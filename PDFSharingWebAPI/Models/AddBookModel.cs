using System.ComponentModel.DataAnnotations;

namespace PDFSharingWebAPI.Models;

public class AddBookRequest
{
    public required String Name { get; set; }

    [StringLength(500)]
    public String? Description { get; set; }

    [FileExtensions(Extensions = "pdf")]
    public required IFormFile FileData { get; set; }
}

public class AddBookResponse
{
    public required String Result { get; set; }
    public String? Message { get; set; }
}
