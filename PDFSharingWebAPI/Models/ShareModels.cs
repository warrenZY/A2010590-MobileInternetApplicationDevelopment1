using System;
using System.ComponentModel.DataAnnotations;

namespace PDFSharingWebAPI.Models;

public class ShareInfo
{
    public required string Token { get; set; }
    public required string FileName { get; set; }
    public DateTime ExpirationTime { get; set; } // 分享过期时间 (UTC)
}

public class GenerateShareLinkRequest
{
    [Required]
    public required string FileName { get; set; }
    public int Duration { get; set; } // 时效时长
    public string? DurationUnit { get; set; } // 时效单位: seconds, minutes, hours, days, permanent
}

public class GenerateShareLinkResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? ShareLinkUrl { get; set; }
}

public class SharedFileInfoResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; } // 可用于显示文件描述或其他信息
    public string? FileName { get; set; }
    public DateTime ExpirationTime { get; set; } // 分享过期时间 (UTC)
}