using Microsoft.AspNetCore.Mvc;
using PDFSharingWebAPI.Models;
using System.IO;
namespace PDFSharingWebAPI.Controllers;


[ApiController]
[Route("api/[controller]")]
public class BookListController : ControllerBase
{

    string filePath = Path.Combine(Directory.GetCurrentDirectory(), "pdf");


    // POST /api/BookList
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

    //Delet /api/BookList
    [HttpDelete]
    public ActionResult<RmvBookResponse> Delete([FromBody]RmvBookRequest request)
    {
        try
        {
            // 验证请求参数
            if (string.IsNullOrWhiteSpace(request?.FileName))
            {
                return BadRequest(new RmvBookResponse
                {
                    Success = false,
                    Message = "Empty file name"
                });
            }

            // 安全验证文件名
            var safeFileName = Path.GetFileName(request.FileName);
            if (string.IsNullOrEmpty(safeFileName) || safeFileName.Contains(".."))
            {
                return BadRequest(new RmvBookResponse
                {
                    Success = false,
                    Message = "Invalid file name"
                });
            }

            // 构建完整路径
            var fullPath = Path.Combine(filePath, safeFileName);

            // 检查文件是否存在
            if (!System.IO.File.Exists(fullPath))
            {
                return NotFound(new RmvBookResponse
                {
                    Success = false,
                    Message = "Target file doesn't exist"
                });
            }

            // 执行删除操作
            System.IO.File.Delete(fullPath);
            Console.WriteLine($"Removed file: {safeFileName}");
            return Ok(new RmvBookResponse
            {
                Success = true,
                Message = $"Successfully removed: {safeFileName}"
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new RmvBookResponse
            {
                Success = false,
                Message = $"Unauthorized access: {ex.Message}"
            });
        }
        catch (IOException ex)
        {
            return StatusCode(500, new RmvBookResponse
            {
                Success = false,
                Message = $"IO exception: {ex.Message}"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new RmvBookResponse
            {
                Success = false,
                Message = $"Server error: {ex.Message}"
            });
        }
    }
}

