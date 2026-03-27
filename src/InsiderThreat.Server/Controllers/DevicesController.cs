using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using InsiderThreat.Shared;

namespace InsiderThreat.Server.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DevicesController : ControllerBase
    {
        private readonly IMongoCollection<DeviceModel> _devices;

        public DevicesController(IMongoDatabase database)
        {
            _devices = database.GetCollection<DeviceModel>("Devices");
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<DeviceModel>>> GetDevices()
        {
            var devices = await _devices.Find(_ => true).ToListAsync();
            return Ok(devices);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<DeviceModel>> GetDevice(string id)
        {
            var device = await _devices.Find(d => d.Id == id).FirstOrDefaultAsync();
            if (device == null) return NotFound();
            return Ok(device);
        }

        [HttpPost]
        public async Task<ActionResult<DeviceModel>> RegisterDevice([FromBody] DeviceModel device)
        {
            device.CreatedAt = DateTime.UtcNow;
            device.LastSeen = DateTime.UtcNow;
            await _devices.InsertOneAsync(device);
            return CreatedAtAction(nameof(GetDevice), new { id = device.Id }, device);
        }

        [HttpPatch("{id}/heartbeat")]
        public async Task<IActionResult> UpdateHeartbeat(string id)
        {
            var update = Builders<DeviceModel>.Update
                .Set(d => d.LastSeen, DateTime.UtcNow)
                .Set(d => d.IsActive, true);
            
            var result = await _devices.UpdateOneAsync(d => d.Id == id, update);
            if (result.MatchedCount == 0) return NotFound();
            return NoContent();
        }
    }
}
