using Microsoft.AspNetCore.Mvc;
using PDFSharingWebAPI.Models;
namespace PDFSharingWebAPI.Controllers;


[ApiController]
[Route("api/[controller]")]
public class BookListController : ControllerBase
{
    // POST
    [HttpPost]
    public AddBookResponse Post([FromBody] AddBookRequest request)
    {
        Console.WriteLine(request.Name);
        AddBookResponse response = new()
        {
            Message = string.Empty,
            Result = string.Empty
        };

        if (request.FileData != null && request.FileData.Length > 0)
        {
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "pdf", request.Name);
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                request.FileData.CopyTo(stream);
            }
            response.Result = "Success";
        }
        else
        {
            response.Result = "Failure";
            response.Message = "Failed uploading file to server";
        }
        return response;
    }
}
