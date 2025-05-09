using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.FileProviders;
using System.Net;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Threading.Tasks; // 添加Task命名空间

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = null;
});

builder.Services.AddCors(options => {
    options.AddPolicy("AllowAll", policy => {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, // 验证签发者
            ValidateAudience = true, // 验证接收者
            ValidateLifetime = true, // 验证过期时间
            ValidateIssuerSigningKey = true, // 验证签名密钥
            ValidIssuer = builder.Configuration["Jwt:Issuer"], // 合法的签发者
            ValidAudience = builder.Configuration["Jwt:Audience"], // 合法的接收者
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)) // 签名密钥
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

var lifetime = app.Services.GetRequiredService<IHostApplicationLifetime>();
lifetime.ApplicationStarted.Register(() =>
{
    LogServerAccessUrls();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication(); // 使用认证中间件
app.UseAuthorization(); // 使用授权中间件

app.UseCors("AllowAll");

app.MapControllers();

var options = new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), "PDFSharingFE")),
    RequestPath = "/static",
};
app.UseStaticFiles(options);
var defaultFileOptions = new DefaultFilesOptions();
defaultFileOptions.DefaultFileNames.Clear();
defaultFileOptions.DefaultFileNames.Add("main.html");
app.UseDefaultFiles(defaultFileOptions);
app.MapGet("/", () => Results.Redirect("/static/main.html"));

app.Run();

void LogServerAccessUrls()
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    var logBuilder = new StringBuilder();
    logBuilder.AppendLine("服务器可访问URL:");

    var urls = app.Urls
        .Select(url => Uri.TryCreate(url, UriKind.Absolute, out var uri) ? uri : null)
        .Where(uri => uri != null)
        .ToList();

    if (!urls.Any())
    {
        logBuilder.AppendLine("    未找到可用的地址!");
        logger.LogInformation(logBuilder.ToString().TrimEnd());
        return;
    }

    var ips = Dns.GetHostAddresses(Dns.GetHostName())
        .Where(addr => addr.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork
                       && !IPAddress.IsLoopback(addr))
        .Distinct()
        .ToList();

    var effectiveIps = ips.Any() ? ips : new List<IPAddress> { IPAddress.Loopback };

    int maxUrlLength = urls.Max(u => $"{u!.Scheme}://xxx.xxx.xxx.xxx:{u.Port}".Length) + 2;

    foreach (var ip in effectiveIps)
    {
        logBuilder.Append("    ");

        for (int i = 0; i < urls.Count; i++)
        {
            var url = urls[i];
            var formattedUrl = $"{url!.Scheme}://{ip}:{url.Port}";
            logBuilder.Append(formattedUrl);

            int paddingNeeded = maxUrlLength - formattedUrl.Length;
            logBuilder.Append(new string(' ', Math.Max(1, paddingNeeded)));
        }

        logBuilder.AppendLine();
    }

    logger.LogInformation(logBuilder.ToString().TrimEnd());
}