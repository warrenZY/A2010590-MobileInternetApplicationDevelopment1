using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.FileProviders;
using System.Net;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

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



// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

var lifetime = app.Services.GetRequiredService<IHostApplicationLifetime>();
lifetime.ApplicationStarted.Register(() =>
{
    LogServerAccessUrls();
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();
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
//Defalut redirect to main.html
app.MapGet("/", () => Results.Redirect("/static/main.html"));

app.Run();

/// Logs all accessible server URLs in a properly formatted single message
/// Output format: 
/// Server URLs:
///     https://ip1:port1    http://ip1:port2
///     https://ip2:port1    http://ip2:port2
/// </summary>
void LogServerAccessUrls()
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    var logBuilder = new StringBuilder();
    logBuilder.AppendLine("Server URLs:");

    // Get the actual listening URLs from the application's Urls property.
    // This is the most reliable source for Kestrel's actual listening addresses
    // after it has started. Configuration sources like appsettings or environment variables
    // determine *what* Kestrel tries to listen on, but app.Urls shows the result.
    var urls = app.Urls
        .Select(url => Uri.TryCreate(url, UriKind.Absolute, out var uri) ? uri : null)
        .Where(uri => uri != null) // Filter out any invalid or null Uris
        .ToList(); // Convert to a list

    // *** CRUCIAL CHECK: ONLY proceed if we found valid URLs ***
    // If the urls list is empty, it means no valid listening addresses were found.
    if (!urls.Any())
    {
        logBuilder.AppendLine("    No available address found!");
        logger.LogInformation(logBuilder.ToString().TrimEnd());
        return;
    }

    // Get all non-loopback IPv4 addresses
    var ips = Dns.GetHostAddresses(Dns.GetHostName())
        .Where(addr => addr.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork
                       && !IPAddress.IsLoopback(addr))
        .Distinct()
        .ToList();

    // If no external IP addresses are found, use localhost (127.0.0.1) as a fallback
    var effectiveIps = ips.Any() ? ips : new List<IPAddress> { IPAddress.Loopback };

    // Use u.Scheme and u.Port directly as the urls list only contains valid Uri objects.
    int maxUrlLength = urls.Max(u => $"{u!.Scheme}://xxx.xxx.xxx.xxx:{u.Port}".Length) + 2;


    // Iterate through the effective IP addresses and listening URLs to build the log message.
    foreach (var ip in effectiveIps)
    {
        logBuilder.Append("    "); // 4-space base indent

        for (int i = 0; i < urls.Count; i++)
        {
            var url = urls[i]; // Get the Uri object
            var formattedUrl = $"{url!.Scheme}://{ip}:{url.Port}";
            logBuilder.Append(formattedUrl);

            // Add padding spaces for alignment
            int paddingNeeded = maxUrlLength - formattedUrl.Length;
            logBuilder.Append(new string(' ', Math.Max(1, paddingNeeded)));
        }

        logBuilder.AppendLine(); // Newline after processing each IP address.
    }

    // Log the final constructed information.
    logger.LogInformation(logBuilder.ToString().TrimEnd());
}