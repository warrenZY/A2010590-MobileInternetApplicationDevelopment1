using Microsoft.AspNetCore.Mvc;
using PDFSharingWebAPI.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;
using System.Text;
using System.Globalization;
using System.Threading; // 添加引用

namespace PDFSharingWebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ShareController : ControllerBase
{
    private readonly string _pdfFilePath;
    private readonly string _sharesFilePath;
    private static readonly object FileLock = new object();

    public ShareController(IConfiguration configuration)
    {
        _pdfFilePath = Path.Combine(Directory.GetCurrentDirectory(), "pdf");
        _sharesFilePath = Path.Combine(Directory.GetCurrentDirectory(), "shares.txt");
        if (!System.IO.File.Exists(_sharesFilePath))
        {
            lock (FileLock)
            {
                System.IO.File.Create(_sharesFilePath).Dispose();
            }
        }
        StartCleanupTask();
    }

    private void StartCleanupTask()
    {
        Task.Run(async () =>
        {
            while (true)
            {
                await Task.Delay(TimeSpan.FromMinutes(5));
                CleanupExpiredShares();
            }
        });
    }

    private void CleanupExpiredShares()
    {
        lock (FileLock)
        {
            try
            {
                var now = DateTime.UtcNow;
                var lines = System.IO.File.ReadAllLines(_sharesFilePath).ToList();
                var updatedLines = new List<string>();

                foreach (var line in lines)
                {
                    var parts = line.Split('|');
                    if (parts.Length == 3)
                    {
                        if (DateTime.TryParseExact(parts[2], "o", CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var expirationTime))
                        {
                            if (expirationTime > now || expirationTime == DateTime.MaxValue.ToUniversalTime())
                            {
                                updatedLines.Add(line);
                            }
                            else
                            {
                                Console.WriteLine($"清理过期分享 Token: {parts[0]}");
                            }
                        }
                        else
                        {
                            Console.WriteLine($"分享文件中的时间格式无效，移除该行: {line}");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"分享文件中的行格式无效，移除该行: {line}");
                    }
                }
                System.IO.File.WriteAllLines(_sharesFilePath, updatedLines, Encoding.UTF8);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"清理过期分享时发生错误: {ex.Message}");
            }
        }
    }

    [HttpPost("generate")]
    [Authorize]
    public IActionResult GenerateShareLink([FromBody] GenerateShareLinkRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new GenerateShareLinkResponse
            {
                Success = false,
                Message = "无效的请求参数"
            });
        }

        var safeFileName = Path.GetFileName(request.FileName);
        var fullPath = Path.Combine(_pdfFilePath, safeFileName);
        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound(new GenerateShareLinkResponse
            {
                Success = false,
                Message = $"文件 '{safeFileName}' 不存在"
            });
        }

        var shareToken = Guid.NewGuid().ToString("N");
        var expirationTime = DateTime.UtcNow;

        switch (request.DurationUnit?.ToLower())
        {
            case "seconds":
                expirationTime = DateTime.UtcNow.AddSeconds(request.Duration);
                break;
            case "minutes":
                expirationTime = DateTime.UtcNow.AddMinutes(request.Duration);
                break;
            case "hours":
                expirationTime = DateTime.UtcNow.AddHours(request.Duration);
                break;
            case "days":
                expirationTime = DateTime.UtcNow.AddDays(request.Duration);
                break;
            case "permanent":
                expirationTime = DateTime.MaxValue.ToUniversalTime();
                break;
            default:
                expirationTime = DateTime.UtcNow.AddHours(1);
                break;
        }

        var shareInfo = new ShareInfo
        {
            Token = shareToken,
            FileName = safeFileName,
            ExpirationTime = expirationTime
        };

        SaveShareInfo(shareInfo);

        var sharePageUrl = $"{Request.Scheme}://{Request.Host}/static/share.html?token={shareToken}";

        Console.WriteLine($"为文件 '{safeFileName}' 生成分享链接: {shareToken}, 过期时间(本地时区): {expirationTime.ToLocalTime()}");

        return Ok(new GenerateShareLinkResponse
        {
            Success = true,
            Message = "分享链接生成成功",
            ShareLinkUrl = sharePageUrl
        });
    }

    [HttpGet("file/{token}")]
    [AllowAnonymous]
    public IActionResult GetSharedFile(string token)
    {
        var shareInfo = GetShareInfo(token);

        if (shareInfo == null)
        {
            return NotFound(new SharedFileInfoResponse
            {
                Success = false,
                Message = "无效的分享码"
            });
        }

        if (shareInfo.ExpirationTime < DateTime.UtcNow && shareInfo.ExpirationTime != DateTime.MaxValue.ToUniversalTime())
        {
            return Unauthorized(new SharedFileInfoResponse
            {
                Success = false,
                Message = "分享链接已过期"
            });
        }

        var fullPath = Path.Combine(_pdfFilePath, shareInfo.FileName);
        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound(new SharedFileInfoResponse
            {
                Success = false,
                Message = $"分享的文件 '{shareInfo.FileName}' 不存在或已被移除"
            });
        }

        Response.Headers.Append("Content-Disposition", new System.Net.Http.Headers.ContentDispositionHeaderValue("inline")
        {
            FileNameStar = shareInfo.FileName
        }.ToString());

        try
        {
            var fileStream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return new FileStreamResult(fileStream, "application/pdf")
            {
                EnableRangeProcessing = true
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"读取文件时发生错误: {ex.Message}");
            return StatusCode(500, new SharedFileInfoResponse
            {
                Success = false,
                Message = $"服务器错误，无法读取文件: {ex.Message}"
            });
        }
    }

    [HttpGet("status/{token}")]
    [AllowAnonymous]
    public IActionResult GetShareStatus(string token)
    {
        var shareInfo = GetShareInfo(token);

        if (shareInfo == null)
        {
            return NotFound(new SharedFileInfoResponse
            {
                Success = false,
                Message = "无效的分享码"
            });
        }

        if (shareInfo.ExpirationTime < DateTime.UtcNow && shareInfo.ExpirationTime != DateTime.MaxValue.ToUniversalTime())
        {
            return Unauthorized(new SharedFileInfoResponse
            {
                Success = false,
                Message = "分享链接已过期"
            });
        }

        var fullPath = Path.Combine(_pdfFilePath, shareInfo.FileName);
        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound(new SharedFileInfoResponse
            {
                Success = false,
                Message = $"分享的文件 '{shareInfo.FileName}' 不存在或已被移除"
            });
        }

        var description = ReadDescriptionFile().TryGetValue(shareInfo.FileName, out var desc) ? desc : "无描述";

        return Ok(new SharedFileInfoResponse
        {
            Success = true,
            FileName = shareInfo.FileName,
            Message = description,
            ExpirationTime = shareInfo.ExpirationTime
        });
    }

    private ShareInfo? GetShareInfo(string token)
    {
        lock (FileLock)
        {
            try
            {
                using (var fs = new FileStream(_sharesFilePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                using (var reader = new StreamReader(fs, Encoding.UTF8))
                {
                    string? line;
                    while ((line = reader.ReadLine()) != null)
                    {
                        var parts = line.Split('|');
                        if (parts.Length == 3 && parts[0] == token)
                        {
                            if (DateTime.TryParseExact(parts[2], "o", CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var expirationTime))
                            {
                                return new ShareInfo
                                {
                                    Token = parts[0],
                                    FileName = parts[1],
                                    ExpirationTime = expirationTime.ToUniversalTime()
                                };
                            }
                            else
                            {
                                Console.WriteLine($"从分享文件读取时发现无效时间格式的行: {line}");
                            }
                        }
                    }
                }
            }
            catch (FileNotFoundException)
            {
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"从分享文件读取信息时发生错误: {ex.Message}");
            }
        }
        return null;
    }

    private void SaveShareInfo(ShareInfo shareInfo)
    {
        lock (FileLock)
        {
            try
            {
                using (var writer = new StreamWriter(_sharesFilePath, true, Encoding.UTF8))
                {
                    writer.WriteLine($"{shareInfo.Token}|{shareInfo.FileName}|{shareInfo.ExpirationTime.ToUniversalTime():o}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"保存分享信息到文件时发生错误: {ex.Message}");
            }
        }
    }

    private Dictionary<string, string> ReadDescriptionFile()
    {
        var descFilePath = Path.Combine(_pdfFilePath, "Description.txt");
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