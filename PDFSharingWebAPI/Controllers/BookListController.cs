using Microsoft.AspNetCore.Mvc;
using PDFSharingWebAPI.Models;
using System.IO;
namespace PDFSharingWebAPI.Controllers;


[ApiController]
[Route("api/[controller]")]
public class BookListController : ControllerBase
{
    // POST
    [HttpPost]
    public AddBookResponse Post([FromForm] AddBookRequest request)
    {
        

        Console.WriteLine($"Recived file: {request.Name}");
        AddBookResponse response = new()
        {
            Message = string.Empty,
            Result = string.Empty
        };

        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage);
            {
                response.Result = "Failure";
                response.Message = errors.ToString();
            }
            return response;
        }

        if (request.FileData != null && request.FileData.Length > 0)
        {
            string filePath = Path.Combine(Directory.GetCurrentDirectory(), "pdf");
            string fullPath = Path.Combine(filePath, request.Name);
            Directory.CreateDirectory(filePath);
            using (var stream = new FileStream(fullPath, FileMode.OpenOrCreate))
            {
                request.FileData.CopyTo(stream);
            }
            response.Result = "Success";
            response.Message = $"Successfully uploaded: {request.Name}";
        }
        else
        {
            response.Result = "Failure";
            response.Message = "Empty file";
        }
        return response;
    }
}
