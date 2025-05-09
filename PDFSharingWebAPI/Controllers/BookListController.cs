// BookListController.cs
using Microsoft.AspNetCore.Mvc;
using PDFSharingWebAPI.Models;
using System.IO;
using Microsoft.AspNetCore.Authorization;
using System.Linq;
using System;
using System.Collections.Generic; // 添加引用
using System.Text; // 添加引用

namespace PDFSharingWebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // 需要认证才能访问
public partial class BookListController : ControllerBase
{
    string filePath = Path.Combine(Directory.GetCurrentDirectory(), "pdf");

    [HttpPost]
    public AddBookResponse Post([FromForm] AddBookRequest request)
    {
        Console.WriteLine($"接收到文件: {request.Name}");
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
                response.Message = string.Join("; ", errors);
            }
            return response;
        }

        if (request.FileData != null && request.FileData.Length > 0)
        {
            string fullPath = Path.Combine(filePath, request.Name);
            Directory.CreateDirectory(filePath);
            try
            {
                using (var stream = new FileStream(fullPath, FileMode.Create))
                {
                    request.FileData.CopyTo(stream);
                }

                if (!string.IsNullOrWhiteSpace(request.Description))
                {
                    string descFilePath = Path.Combine(filePath, "Description.txt");
                    UpdateDescriptionFile(descFilePath, request.Name, request.Description);
                }

                response.Result = "Success";
                response.Message = $"成功上传: {request.Name}";
            }
            catch (Exception ex)
            {
                response.Result = "Failure";
                response.Message = $"文件处理失败: {ex.Message}";
            }
        }
        else
        {
            response.Result = "Failure";
            response.Message = "空文件";
        }
        return response;
    }

    [HttpDelete]
    public ActionResult<RmvBookResponse> Delete([FromBody] RmvBookRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request?.FileName))
            {
                return BadRequest(new RmvBookResponse
                {
                    Success = false,
                    Message = "文件名为空"
                });
            }

            var safeFileName = Path.GetFileName(request.FileName);
            if (string.IsNullOrEmpty(safeFileName) || safeFileName.Contains(".."))
            {
                return BadRequest(new RmvBookResponse
                {
                    Success = false,
                    Message = "无效的文件名"
                });
            }

            var fullPath = Path.Combine(filePath, safeFileName);

            if (!System.IO.File.Exists(fullPath))
            {
                return NotFound(new RmvBookResponse
                {
                    Success = false,
                    Message = "目标文件不存在"
                });
            }

            System.IO.File.Delete(fullPath);
            Console.WriteLine($"已移除文件: {safeFileName}");
            return Ok(new RmvBookResponse
            {
                Success = true,
                Message = $"成功移除: {safeFileName}"
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new RmvBookResponse
            {
                Success = false,
                Message = $"无权访问: {ex.Message}"
            });
        }
        catch (IOException ex)
        {
            return StatusCode(500, new RmvBookResponse
            {
                Success = false,
                Message = $"IO错误: {ex.Message}"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new RmvBookResponse
            {
                Success = false,
                Message = $"服务器错误: {ex.Message}"
            });
        }
    }
}