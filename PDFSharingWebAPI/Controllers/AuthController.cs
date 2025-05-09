using Microsoft.AspNetCore.Mvc;
using PDFSharingWebAPI.Models;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System;
using System.Security.Cryptography;
using System.IO; // 添加引用
using System.Threading; // 添加引用 for ReaderWriterLockSlim

namespace PDFSharingWebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly string _usersFilePath; // 用户数据存储文件路径
    // 使用 ReaderWriterLockSlim 以支持多读单写
    private static ReaderWriterLockSlim _usersFileLock = new ReaderWriterLockSlim();

    public AuthController(IConfiguration configuration)
    {
        _configuration = configuration;
        _usersFilePath = Path.Combine(Directory.GetCurrentDirectory(), "users.txt");
        // 确保用户数据文件存在
        if (!System.IO.File.Exists(_usersFilePath))
        {
            _usersFileLock.EnterWriteLock();
            try
            {
                System.IO.File.Create(_usersFilePath).Dispose();
            }
            finally
            {
                _usersFileLock.ExitWriteLock();
            }
        }
    }

    [HttpPost("register")]
    public IActionResult Register([FromBody] RegisterRequest request)
    {
        var existingUser = GetUserByUsername(request.Username);
        if (existingUser != null)
        {
            return BadRequest(new { Message = "用户已存在" });
        }

        var saltBytes = new byte[16];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(saltBytes);
        }
        var salt = Convert.ToBase64String(saltBytes);
        var passwordHash = HashPassword(request.Password, salt);

        var newUser = new User { Username = request.Username, PasswordHash = passwordHash, Salt = salt };
        SaveUser(newUser); // 保存到文件

        return Ok(new { Message = "注册成功" });
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        var user = GetUserByUsername(request.Username);

        if (user == null)
        {
            return Unauthorized(new LoginResponse { Success = false, Message = "用户名或密码错误" });
        }

        var hashedPasswordAttempt = HashPassword(request.Password, user.Salt);
        if (hashedPasswordAttempt != user.PasswordHash)
        {
            return Unauthorized(new LoginResponse { Success = false, Message = "用户名或密码错误" });
        }

        var token = GenerateJwtToken(user);

        return Ok(new LoginResponse { Success = true, Message = "登录成功", Token = token });
    }

    private string GenerateJwtToken(User user)
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Username)
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // 使用SHA256哈希密码（不推荐用于高安全性密码存储）
    private string HashPassword(string password, string salt)
    {
        using (var sha256 = SHA256.Create())
        {
            var saltedPasswordBytes = Encoding.UTF8.GetBytes(password + salt);
            var hashBytes = sha256.ComputeHash(saltedPasswordBytes);
            return Convert.ToBase64String(hashBytes);
        }
    }

    // 从文件中获取用户
    private User? GetUserByUsername(string username)
    {
        _usersFileLock.EnterReadLock();
        try
        {
            if (!System.IO.File.Exists(_usersFilePath))
            {
                return null;
            }

            var lines = System.IO.File.ReadAllLines(_usersFilePath);
            foreach (var line in lines)
            {
                var parts = line.Split('|');
                if (parts.Length == 3 && parts[0] == username)
                {
                    return new User
                    {
                        Username = parts[0],
                        PasswordHash = parts[1],
                        Salt = parts[2]
                    };
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"从用户文件读取信息时发生错误: {ex.Message}");
        }
        finally
        {
            _usersFileLock.ExitReadLock();
        }
        return null;
    }

    // 保存用户到文件 (追加方式)
    private void SaveUser(User user)
    {
        _usersFileLock.EnterWriteLock();
        try
        {
            // 存储为: username|passwordHash|salt
            using (var writer = new StreamWriter(_usersFilePath, true, Encoding.UTF8))
            {
                writer.WriteLine($"{user.Username}|{user.PasswordHash}|{user.Salt}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"保存用户信息到文件时发生错误: {ex.Message}");
        }
        finally
        {
            _usersFileLock.ExitWriteLock();
        }
    }
}