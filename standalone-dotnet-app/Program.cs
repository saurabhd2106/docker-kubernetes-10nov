using System.Net;
using Microsoft.Extensions.FileProviders;
using Training.Blog;

// Serves the static blog under wwwroot/.
// Clean URLs map to files: "/" is index.html, "/about" is about.html, and "/posts/foo" is posts/foo.html.

const string ServerInfoToken = "{{SERVER_INFO}}";

var port = int.TryParse(Environment.GetEnvironmentVariable("PORT"), out var configuredPort) ? configuredPort : 8080;

if (args.Contains("--healthcheck"))
{
    return await HealthCheck.RunAsync(port);
}

var contentTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
{
    ["html"] = "text/html; charset=utf-8",
    ["css"] = "text/css; charset=utf-8",
    ["js"] = "text/javascript; charset=utf-8",
    ["svg"] = "image/svg+xml",
    ["png"] = "image/png",
    ["ico"] = "image/x-icon",
    ["txt"] = "text/plain; charset=utf-8",
};

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
builder.Logging.ClearProviders();
builder.Logging.AddSimpleConsole(options =>
{
    options.SingleLine = true;
    options.UseUtcTimestamp = true;
    options.TimestampFormat = "yyyy-MM-ddTHH:mm:ssZ ";
});
builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.Warning);

var app = builder.Build();
var webRoot = app.Environment.WebRootFileProvider;
var hostname = Dns.GetHostName();
var serverInfoHtml =
    $"Served by <code>{WebUtility.HtmlEncode(hostname)}</code> on port <code>{port}</code> " +
    $"&middot; .NET <code>{WebUtility.HtmlEncode(Environment.Version.ToString())}</code>";

app.MapGet("/health", () => Results.Text("ok\n", "text/plain; charset=utf-8"));

app.MapFallback("{*path}", async context =>
{
    var request = context.Request;
    if (!HttpMethods.IsGet(request.Method) && !HttpMethods.IsHead(request.Method))
    {
        context.Response.Headers.Allow = "GET, HEAD";
        await Send(context, StatusCodes.Status405MethodNotAllowed, "text/plain; charset=utf-8", "Method Not Allowed\n"u8.ToArray());
        return;
    }

    var resource = Resolve(request.Path.Value);
    var body = resource is null ? null : await ReadResource(webRoot, resource);
    var status = StatusCodes.Status200OK;
    if (resource is null || body is null)
    {
        status = StatusCodes.Status404NotFound;
        resource = "404.html";
        body = await ReadResource(webRoot, resource) ?? [];
    }
    await Send(context, status, ContentType(resource), Render(resource, body));
});

app.Lifetime.ApplicationStarted.Register(() =>
    app.Logger.LogInformation("Blog listening on http://0.0.0.0:{Port} (.NET {Version}, host {Host})",
        port, Environment.Version, hostname));
await app.RunAsync();
return 0;

// Maps a request path to a file under wwwroot/, or null if the path is not allowed.
static string? Resolve(string? path)
{
    if (string.IsNullOrEmpty(path) || path.Contains('\\') || path.Contains('\0'))
    {
        return null;
    }
    if (path.Split('/').Any(segment => segment is "." or ".."))
    {
        return null;
    }
    var relative = path[1..];
    if (relative.Length == 0 || relative.EndsWith('/'))
    {
        relative += "index.html";
    }
    var lastSegment = relative[(relative.LastIndexOf('/') + 1)..];
    if (!lastSegment.Contains('.'))
    {
        relative += ".html";
    }
    return relative;
}

static async Task<byte[]?> ReadResource(IFileProvider root, string relative)
{
    var file = root.GetFileInfo(relative);
    if (!file.Exists || file.IsDirectory)
    {
        return null;
    }
    await using var stream = file.CreateReadStream();
    using var buffer = new MemoryStream();
    await stream.CopyToAsync(buffer);
    return buffer.ToArray();
}

byte[] Render(string resource, byte[] body)
{
    if (!resource.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
    {
        return body;
    }
    var html = System.Text.Encoding.UTF8.GetString(body).Replace(ServerInfoToken, serverInfoHtml);
    return System.Text.Encoding.UTF8.GetBytes(html);
}

string ContentType(string resource)
{
    var extension = resource[(resource.LastIndexOf('.') + 1)..];
    return contentTypes.GetValueOrDefault(extension, "application/octet-stream");
}

async Task Send(HttpContext context, int status, string contentType, byte[] body)
{
    var response = context.Response;
    response.StatusCode = status;
    response.ContentType = contentType;
    response.ContentLength = body.Length;
    if (!HttpMethods.IsHead(context.Request.Method))
    {
        await response.Body.WriteAsync(body);
    }
    app.Logger.LogInformation("{Method} {Path}{Query} -> {Status}",
        context.Request.Method, context.Request.Path, context.Request.QueryString, status);
}
