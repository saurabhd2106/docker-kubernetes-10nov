namespace Training.Blog;

/// <summary>
/// Returns 0 when /health on the local server answers 200, 1 otherwise.
/// Used by the Docker HEALTHCHECK because the runtime image has no curl or wget.
/// </summary>
public static class HealthCheck
{
    public static async Task<int> RunAsync(int port)
    {
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
        try
        {
            using var response = await client.GetAsync($"http://127.0.0.1:{port}/health");
            return response.StatusCode == System.Net.HttpStatusCode.OK ? 0 : 1;
        }
        catch (Exception e)
        {
            Console.Error.WriteLine($"Health check failed: {e.Message}");
            return 1;
        }
    }
}
