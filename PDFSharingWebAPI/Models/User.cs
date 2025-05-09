using System.ComponentModel.DataAnnotations;

namespace PDFSharingWebAPI.Models;

public class User
{
    public required string Username { get; set; }
    public required string PasswordHash { get; set; } // 存储密码哈希
    public required string Salt { get; set; } // 存储盐
}

public class RegisterRequest
{
    [Required]
    public required string Username { get; set; }
    [Required]
    public required string Password { get; set; }
}

public class LoginRequest
{
    [Required]
    public required string Username { get; set; }
    [Required]
    public required string Password { get; set; }
}

public class LoginResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? Token { get; set; } // JWT Token
}