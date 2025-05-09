using Microsoft.AspNetCore.Mvc;
using PDFSharingWebAPI.Models;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.AspNetCore.Authorization; // 添加引用
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System;

namespace PDFSharingWebAPI.Controllers;

[Authorize] // 需要认证才能访问控制器中的大多数Action
public partial class BookListController : ControllerBase
{
    // Get /api/BookList
    [HttpGet]
    public ActionResult<IEnumerable<PdfFileInfo>> GetPdfList()
    {
        try
        {
            if (!Directory.Exists(filePath))
            {
                Directory.CreateDirectory(filePath);
                return NotFound(new { Message = "PDF文件目录不存在，已创建新目录" });
            }

            var descriptions = ReadDescriptionFile();

            var pdfFiles = Directory.GetFiles(filePath, "*.pdf", SearchOption.TopDirectoryOnly)
                .Select(filePath => new FileInfo(filePath))
                .Select(fi => new PdfFileInfo
                {
                    FileName = fi.Name,
                    CreationTime = fi.CreationTimeUtc,
                    Description = descriptions.TryGetValue(fi.Name, out var desc) ? desc : null
                })
                .OrderBy(f => f.FileName)
                .ToList();

            return Ok(pdfFiles);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { Message = $"无权访问: {ex.Message}" });
        }
        catch (IOException ex)
        {
            return StatusCode(500, new { Message = $"IO错误: {ex.Message}" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = $"服务器错误: {ex.Message}" });
        }
    }

    private void UpdateDescriptionFile(string filePath, string fileName, string description)
    {
        var lines = new List<string>();
        bool exists = false;

        if (System.IO.File.Exists(filePath))
        {
            lines = System.IO.File.ReadAllLines(filePath).ToList();
        }

        var newLine = $"{fileName}---{description.Replace("\n", " ").Replace("\r", "")}";

        for (int i = 0; i < lines.Count; i++)
        {
            if (lines[i].StartsWith(fileName + "---"))
            {
                lines[i] = newLine;
                exists = true;
                break;
            }
        }

        if (!exists)
        {
            lines.Add(newLine);
        }

        using (var fs = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.ReadWrite))
        using (var sw = new StreamWriter(fs, Encoding.UTF8))
        {
            foreach (var line in lines)
            {
                sw.WriteLine(line);
            }
        }
    }

    // Get /api/BookList/{filename} - 提供文件内容
    [HttpGet("{filename}")]
    [AllowAnonymous] // 允许匿名访问此Action，以便未登录用户或通过直链预览/下载
    public IActionResult GetPdf(string filename)
    {
        try
        {
            var safeFileName = Path.GetFileName(filename);
            if (string.IsNullOrEmpty(safeFileName))
            {
                return BadRequest("无效的文件名");
            }

            var fullPath = Path.Combine(filePath, safeFileName);

            if (!System.IO.File.Exists(fullPath))
            {
                return NotFound($"文件 '{safeFileName}' 不存在");
            }

            if (!Path.GetExtension(fullPath).Equals(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("请求的文件不是PDF");
            }

            Response.Headers.Append("Content-Disposition", new ContentDispositionHeaderValue("inline")
            {
                FileNameStar = safeFileName
            }.ToString());

            var fileStream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return new FileStreamResult(fileStream, "application/pdf")
            {
                EnableRangeProcessing = true
            };
        }
        catch (UnauthorizedAccessException ex)
        {
            // 尽管允许匿名，但如果底层文件系统权限问题，仍可能发生403
            return StatusCode(403, $"无权访问文件系统: {ex.Message}");
        }
        catch (IOException ex)
        {
            return StatusCode(500, $"IO错误: {ex.Message}");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"服务器错误: {ex.Message}");
        }
    }

    private Dictionary<string, string> ReadDescriptionFile()
    {
        var descFilePath = Path.Combine(filePath, "Description.txt");
        var descriptions = new Dictionary<string, string>();

        if (!System.IO.File.Exists(descFilePath))
        {
            return descriptions;
        }

        try
        {
            using (var fs = new FileStream(descFilePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            using (var reader = new StreamReader(fs, Encoding.UTF8))
            {
                string? line;
                while ((line = reader.ReadLine()) != null)
                {
                    try
                    {
                        var parts = line.Split(new[] { "---" }, 2, StringSplitOptions.None);
                        if (parts.Length == 2 && !string.IsNullOrWhiteSpace(parts[0]))
                        {
                            descriptions[parts[0]] = parts[1];
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"读取描述文件行时发生错误: {line} - {ex.Message}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"读取描述文件时发生错误: {ex.Message}");
        }
        return descriptions;
    }
}