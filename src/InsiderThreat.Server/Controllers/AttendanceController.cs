using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using InsiderThreat.Shared;
using System.Security.Claims;

namespace InsiderThreat.Server.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AttendanceController : ControllerBase
{
    private readonly IMongoCollection<AttendanceLog> _attendanceCollection;
    private readonly IMongoCollection<AttendanceConfig> _configCollection;

    public AttendanceController(IMongoDatabase database)
    {
        _attendanceCollection = database.GetCollection<AttendanceLog>("AttendanceLogs");
        _configCollection = database.GetCollection<AttendanceConfig>("AttendanceConfig");
    }

    // POST: api/attendance/checkin
    [HttpPost("checkin")]
    public async Task<IActionResult> CheckIn([FromBody] AttendanceLog log)
    {
        log.Id = null; // Ensure new ID
        log.CheckInTime = DateTime.Now;

        // If UserId is not provided, try to get from claims (logged in user)
        if (string.IsNullOrEmpty(log.UserId))
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userName = User.FindFirst(ClaimTypes.Name)?.Value;

            if (userId != null)
            {
                log.UserId = userId;
                log.UserName = userName ?? "Unknown";
            }
        }

        await _attendanceCollection.InsertOneAsync(log);

        return Ok(new { Message = "Check-in successful", Time = log.CheckInTime });
    }

    // GET: api/attendance/history
    [HttpGet("history")]
    public async Task<ActionResult<List<AttendanceLog>>> GetHistory()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (role == "Admin")
        {
            // Admin sees all, sorted by new
            var logs = await _attendanceCollection.Find(_ => true)
                .SortByDescending(x => x.CheckInTime)
                .ToListAsync();
            return Ok(logs);
        }
        else
        {
            // User sees own
            if (userId == null) return Unauthorized();

            var logs = await _attendanceCollection.Find(x => x.UserId == userId)
                .SortByDescending(x => x.CheckInTime)
                .ToListAsync();
            return Ok(logs);
        }
    }

    // GET: api/attendance/config
    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Admin") return Forbid();

        var config = await _configCollection.Find(c => c.ConfigType == "NetworkSettings").FirstOrDefaultAsync();
        if (config == null)
        {
            config = new AttendanceConfig { AllowedIPs = "" };
        }
        return Ok(config);
    }

    // POST: api/attendance/config
    [HttpPost("config")]
    public async Task<IActionResult> UpdateConfig([FromBody] AttendanceConfig newConfig)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
        if (role != "Admin") return Forbid();

        var filter = Builders<AttendanceConfig>.Filter.Eq(c => c.ConfigType, "NetworkSettings");
        var existing = await _configCollection.Find(filter).FirstOrDefaultAsync();

        if (existing == null)
        {
            newConfig.ConfigType = "NetworkSettings";
            newConfig.UpdatedAt = DateTime.Now;
            newConfig.UpdatedBy = userName;
            await _configCollection.InsertOneAsync(newConfig);
        }
        else
        {
            var update = Builders<AttendanceConfig>.Update
                .Set(c => c.AllowedIPs, newConfig.AllowedIPs)
                .Set(c => c.UpdatedAt, DateTime.Now)
                .Set(c => c.UpdatedBy, userName);
            await _configCollection.UpdateOneAsync(filter, update);
        }

        return Ok(new { Message = "Configuration updated successfully" });
    }

    // GET: api/attendance/can-checkin
    [HttpGet("can-checkin")]
    public async Task<IActionResult> CanCheckIn()
    {
        var currentIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        // localhost checking (IPv6 ::1 mapped to 127.0.0.1 for local testing ease if needed, though RemoteIpAddress will show ::1 or 127.0.0.1)
        if (currentIp == "::1") currentIp = "127.0.0.1";

        var config = await _configCollection.Find(c => c.ConfigType == "NetworkSettings").FirstOrDefaultAsync();
        
        bool canCheckIn = true; // default true if no config restriction is set
        
        if (config != null && !string.IsNullOrWhiteSpace(config.AllowedIPs))
        {
            var allowedIps = config.AllowedIPs.Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                                                .Select(ip => ip.Trim())
                                                .ToList();

            // Strict IP check for exact match in this implementation.
            if (!allowedIps.Contains(currentIp))
            {
                canCheckIn = false;
            }
        }

        return Ok(new { canCheckIn, currentIp, restrictionEnabled = config != null && !string.IsNullOrWhiteSpace(config.AllowedIPs) });
    }
}
