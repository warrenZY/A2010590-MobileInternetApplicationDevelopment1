using Microsoft.AspNetCore.Mvc;
using PDFSharingWebAPI.Models;
using System.Net.Http.Headers;
using System.Text;

namespace PDFSharingWebAPI.Controllers;

public partial class BookListController : ControllerBase
{

    //Get /api/BookList 
    [HttpGet]
    public ActionResult<IEnumerable<PdfFileInfo>> GetPdfList()
    {
        try
        {
            if (!Directory.Exists(filePath))
            {
                Directory.CreateDirectory(filePath);
                return NotFound(new { Message = "PDF file directory not found, creating new..." });
            }

            // Read description
            var descriptions = ReadDescriptionFile();

            // Search path
            var pdfFiles = Directory.GetFiles(filePath, "*.pdf", SearchOption.TopDirectoryOnly)
                .Select(filePath => new FileInfo(filePath))
                .Select(fi => new PdfFileInfo
                {
                    FileName = fi.Name,
                    CreationTime = fi.CreationTime,
                    Description = descriptions.TryGetValue(fi.Name, out var desc) ? desc : null
                })
                .OrderBy(f => f.FileName)
                .ToList();

            return Ok(pdfFiles);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { Message = $"Access denied: {ex.Message}" });
        }
        catch (IOException ex)
        {
            return StatusCode(500, new { Message = $"IO error: {ex.Message}" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = $"Server error: {ex.Message}" });
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

        // Find and replace exist data.
        for (int i = 0; i < lines.Count; i++)
        {
            if (lines[i].StartsWith(fileName + "---"))
            {
                lines[i] = newLine;
                exists = true;
                break;
            }
        }

        // Add new line.
        if (!exists)
        {
            lines.Add(newLine);
        }

        // Write data in to the file.
        using (var fs = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.ReadWrite))
        using (var sw = new StreamWriter(fs, Encoding.UTF8))
        {
            foreach (var line in lines)
            {
                sw.WriteLine(line);
            }
        }
    }

    //Get /api/BookList/{filename}
    [HttpGet("{filename}")]
    public IActionResult GetPdf(string filename)
    {
        try
        {
            var safeFileName = Path.GetFileName(filename);
            if (string.IsNullOrEmpty(safeFileName))
            {
                return BadRequest("Invalid file name");
            }

            var fullPath = Path.Combine(filePath, safeFileName);

            if (!System.IO.File.Exists(fullPath))
            {
                return NotFound($"File {safeFileName} not found");
            }

            // check required file type
            if (!Path.GetExtension(fullPath).Equals(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Requested file is not a PDF");
            }

            // Allow browser previewing feature
            Response.Headers.Append("Content-Disposition", new ContentDispositionHeaderValue("inline")
            {
                FileNameStar = safeFileName // 支持UTF-8文件名编码
            }.ToString());

            // 返回文件流（不自动设置FileDownloadName）
            return new PhysicalFileResult(fullPath, "application/pdf")
            {
                EnableRangeProcessing = true // 保持断点续传支持
            };
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, $"Access denied: {ex.Message}");
        }
        catch (IOException ex)
        {
            return StatusCode(500, $"IO error: {ex.Message}");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Server error: {ex.Message}");
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

        foreach (var line in System.IO.File.ReadLines(descFilePath))
        {
            try
            {
                var parts = line.Split(new[] { "---" }, 2, StringSplitOptions.None);
                if (parts.Length == 2 && !string.IsNullOrWhiteSpace(parts[0]))
                {
                    // Use filename as Key, latest will override.
                    descriptions[parts[0]] = parts[1];
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Invalid description line: {line} - {ex.Message}");
            }
        }

        return descriptions;
    }
}