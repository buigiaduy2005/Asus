using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using InsiderThreat.Server.Models;
using InsiderThreat.Shared;
using System.Security.Claims;

namespace InsiderThreat.Server.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class GroupsController : ControllerBase
    {
        private readonly IMongoCollection<Group> _groups;
        private readonly IMongoCollection<InsiderThreat.Shared.User> _users;
        private readonly IMongoCollection<ProjectTask> _tasks;
        private readonly IMongoCollection<SharedDocument> _documents;
        private readonly IGridFSBucket _gridFS;
        private readonly ILogger<GroupsController> _logger;

        public GroupsController(IMongoDatabase database, IGridFSBucket gridFS, ILogger<GroupsController> logger)
        {
            _groups = database.GetCollection<Group>("Groups");
            _users = database.GetCollection<InsiderThreat.Shared.User>("Users");
            _tasks = database.GetCollection<ProjectTask>("ProjectTasks");
            _documents = database.GetCollection<SharedDocument>("SharedDocuments");
            _gridFS = gridFS;
            _logger = logger;
        }

        // GET: api/Groups
        [HttpGet]
        public async Task<IActionResult> GetGroups()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                // Get groups where user is a member or group is public
                var groups = await _groups
                    .Find(g => g.MemberIds.Contains(userId!) || 
                               g.Privacy.ToLower() == "public" || 
                               g.Privacy.ToUpper() == "PUBLIC")
                    .SortBy(g => g.Name)
                    .ToListAsync();

                return Ok(groups);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching groups", error = ex.Message });
            }
        }

        // GET: api/Groups/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetGroupById(string id)
        {
            try
            {
                var group = await _groups.Find(g => g.Id == id).FirstOrDefaultAsync();

                if (group == null)
                {
                    return NotFound(new { message = "Group not found" });
                }

                return Ok(group);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching group", error = ex.Message });
            }
        }

        // POST: api/Groups
        [HttpPost]
        public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var memberIds = request.MemberIds ?? new List<string>();
                if (!memberIds.Contains(userId))
                {
                    memberIds.Add(userId); // Ensure creator is always a member
                }

                var group = new Group
                {
                    Name = request.Name,
                    Description = request.Description,
                    Type = request.Type ?? "Department",
                    Privacy = string.IsNullOrEmpty(request.Privacy) ? "Public" : 
                              char.ToUpper(request.Privacy[0]) + request.Privacy.Substring(1).ToLower(),
                    AdminIds = new List<string> { userId },
                    MemberIds = memberIds,
                    IsProject = request.IsProject,
                    ProjectStartDate = request.ProjectStartDate,
                    ProjectEndDate = request.ProjectEndDate,
                    CreatedAt = DateTime.UtcNow
                };

                await _groups.InsertOneAsync(group);

                return CreatedAtAction(nameof(GetGroupById), new { id = group.Id }, group);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error creating group", error = ex.Message });
            }
        }

        // PATCH: api/Groups/{id}
        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateGroup(string id, [FromBody] UpdateGroupRequest request)
        {
            try
            {
                var group = await _groups.Find(g => g.Id == id).FirstOrDefaultAsync();
                if (group == null) return NotFound();

                var update = Builders<Group>.Update
                    .Set(g => g.Name, request.Name ?? group.Name)
                    .Set(g => g.Description, request.Description ?? group.Description)
                    .Set(g => g.ProjectStartDate, request.ProjectStartDate ?? group.ProjectStartDate)
                    .Set(g => g.ProjectEndDate, request.ProjectEndDate ?? group.ProjectEndDate)
                    .Set(g => g.UpdatedAt, DateTime.UtcNow);

                await _groups.UpdateOneAsync(g => g.Id == id, update);
                return Ok(new { message = "Group updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating group", error = ex.Message });
            }
        }

        // GET: api/Groups/{id}/members-details
        [HttpGet("{id}/members-details")]
        public async Task<IActionResult> GetGroupMembers(string id)
        {
            try
            {
                var group = await _groups.Find(g => g.Id == id).FirstOrDefaultAsync();
                if (group == null) return NotFound();

                var users = await _users.Find(u => group.MemberIds.Contains(u.Id!)).ToListAsync();
                var result = users.Select(u => new {
                    u.Id,
                    u.Username,
                    u.FullName,
                    u.Email,
                    u.AvatarUrl,
                    IsAdmin = group.AdminIds.Contains(u.Id!)
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching members", error = ex.Message });
            }
        }

        // ─── TASK MANAGEMENT ──────────────────────────

        [HttpGet("{id}/tasks")]
        public async Task<IActionResult> GetTasks(string id)
        {
            var tasks = await _tasks.Find(t => t.GroupId == id).SortByDescending(t => t.CreatedAt).ToListAsync();
            return Ok(tasks);
        }

        [HttpPost("{id}/tasks")]
        public async Task<IActionResult> CreateTask(string id, [FromBody] CreateTaskRequest taskReq)
        {
            var task = new ProjectTask
            {
                GroupId = id,
                Title = taskReq.Title,
                Description = taskReq.Description,
                AssignedTo = taskReq.AssignedTo,
                Status = taskReq.Status ?? "Todo",
                Priority = taskReq.Priority ?? "Normal",
                Deadline = taskReq.Deadline,
                CreatedAt = DateTime.UtcNow
            };
            
            await _tasks.InsertOneAsync(task);
            return Ok(task);
        }

        [HttpPut("{id}/tasks/{taskId}")]
        public async Task<IActionResult> UpdateTask(string id, string taskId, [FromBody] CreateTaskRequest taskReq)
        {
            var existing = await _tasks.Find(t => t.Id == taskId && t.GroupId == id).FirstOrDefaultAsync();
            if (existing == null) return NotFound();

            var update = Builders<ProjectTask>.Update
                .Set(t => t.Title, taskReq.Title)
                .Set(t => t.Description, taskReq.Description)
                .Set(t => t.AssignedTo, taskReq.AssignedTo)
                .Set(t => t.Status, taskReq.Status ?? existing.Status)
                .Set(t => t.Priority, taskReq.Priority ?? existing.Priority)
                .Set(t => t.Deadline, taskReq.Deadline);

            if (taskReq.Status == "Done" && existing.Status != "Done")
            {
                update = update
                    .Set(t => t.CompletedAt, DateTime.UtcNow)
                    .Set(t => t.CompletedBy, User.FindFirst(ClaimTypes.NameIdentifier)?.Value)
                    .Set(t => t.Progress, 100);
            }

            await _tasks.UpdateOneAsync(t => t.Id == taskId, update);
            return Ok(new { message = "Task updated" });
        }

        [HttpDelete("{id}/tasks/{taskId}")]
        public async Task<IActionResult> DeleteTask(string id, string taskId)
        {
            await _tasks.DeleteOneAsync(t => t.Id == taskId && t.GroupId == id);
            return Ok(new { message = "Task deleted" });
        }

        [HttpGet("{id}/contribution-stats")]
        public async Task<IActionResult> GetContributionStats(string id)
        {
            var tasks = await _tasks.Find(t => t.GroupId == id && t.Status == "Done" && t.CompletedAt != null).ToListAsync();
            
            var stats = tasks
                .GroupBy(t => t.CompletedAt!.Value.Date)
                .Select(g => new {
                    Date = g.Key.ToString("yyyy-MM-dd"),
                    Count = g.Count()
                })
                .ToList();

            return Ok(stats);
        }

        // POST: api/Groups/{id}/join
        [HttpPost("{id}/join")]
        public async Task<IActionResult> JoinGroup(string id)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var group = await _groups.Find(g => g.Id == id).FirstOrDefaultAsync();

                if (group == null)
                {
                    return NotFound(new { message = "Group not found" });
                }

                if (group.MemberIds.Contains(userId!))
                {
                    return BadRequest(new { message = "Already a member" });
                }

                group.MemberIds.Add(userId!);
                var update = Builders<Group>.Update.Set(g => g.MemberIds, group.MemberIds);
                await _groups.UpdateOneAsync(g => g.Id == id, update);

                return Ok(new { message = "Joined group successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error joining group", error = ex.Message });
            }
        }

        // POST: api/Groups/{id}/leave
        [HttpPost("{id}/leave")]
        public async Task<IActionResult> LeaveGroup(string id)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var group = await _groups.Find(g => g.Id == id).FirstOrDefaultAsync();

                if (group == null)
                {
                    return NotFound(new { message = "Group not found" });
                }

                if (!group.MemberIds.Contains(userId!))
                {
                    return BadRequest(new { message = "Not a member" });
                }

                group.MemberIds.Remove(userId!);
                var update = Builders<Group>.Update.Set(g => g.MemberIds, group.MemberIds);
                await _groups.UpdateOneAsync(g => g.Id == id, update);

                return Ok(new { message = "Left group successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error leaving group", error = ex.Message });
            }
        }

        // DELETE: api/Groups/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteGroup(string id)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var group = await _groups.Find(g => g.Id == id).FirstOrDefaultAsync();

                if (group == null)
                {
                    return NotFound(new { message = "Group not found" });
                }

                // Only group admins can delete the group
                if (!group.AdminIds.Contains(userId!))
                {
                    return Forbid();
                }

                var result = await _groups.DeleteOneAsync(g => g.Id == id);

                if (result.DeletedCount == 0)
                {
                    return NotFound(new { message = "Group not found or already deleted" });
                }

                return Ok(new { message = "Group deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting group", error = ex.Message });
            }
        }

        // [ADD] GET /api/groups/{id}/files
        [HttpGet("{id}/files")]
        public async Task<ActionResult<IEnumerable<SharedDocument>>> GetProjectFiles(string id)
        {
            var group = await _groups.Find(g => g.Id == id).FirstOrDefaultAsync();
            if (group == null || group.SharedDocumentIds == null || !group.SharedDocumentIds.Any())
                return Ok(new List<SharedDocument>());

            var files = await _documents.Find(d => group.SharedDocumentIds.Contains(d.Id)).ToListAsync();
            return Ok(files);
        }

        // [ADD] POST /api/groups/{id}/files
        [HttpPost("{id}/files")]
        public async Task<ActionResult<SharedDocument>> UploadProjectFile(string id, [FromForm] IFormFile file, [FromForm] string? description)
        {
            var group = await _groups.Find(g => g.Id == id).FirstOrDefaultAsync();
            if (group == null) return NotFound("Project not found");

            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            try
            {
                // 1. Upload to GridFS
                var options = new GridFSUploadOptions
                {
                    Metadata = new BsonDocument
                    {
                        { "originalName", file.FileName },
                        { "contentType", file.ContentType },
                        { "uploadedAt", DateTime.UtcNow },
                        { "projectId", id }
                    }
                };

                using var stream = file.OpenReadStream();
                var fileId = await _gridFS.UploadFromStreamAsync(file.FileName, stream, options);

                // 2. Create SharedDocument metadata
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "unknown";
                var userName = User.FindFirst("FullName")?.Value ?? User.Identity?.Name ?? "Unknown";

                var doc = new SharedDocument
                {
                    FileId = fileId.ToString(),
                    FileName = file.FileName,
                    ContentType = file.ContentType,
                    UploaderId = userId,
                    UploaderName = userName,
                    Size = file.Length,
                    Description = description ?? $"Uploaded to project {group.Name}",
                    UploadDate = DateTime.UtcNow,
                    MinimumRole = "Nhân viên",
                    // Auto-allow all group members
                    AllowedUserIds = group.MemberIds ?? new List<string>(),
                    AllowedDownloadUserIds = group.MemberIds ?? new List<string>()
                };

                await _documents.InsertOneAsync(doc);

                // 3. Link to group
                if (group.SharedDocumentIds == null) group.SharedDocumentIds = new List<string>();
                group.SharedDocumentIds.Add(doc.Id);
                await _groups.ReplaceOneAsync(g => g.Id == id, group);

                return Ok(doc);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error uploading project file: {file.FileName}");
                return StatusCode(500, "Internal server error during upload");
            }
        }

        // [ADD] GET /api/groups/{id}/leak-alerts
        [HttpGet("{id}/leak-alerts")]
        public async Task<IActionResult> GetProjectLeakAlerts(string id, [FromQuery] int limit = 10)
        {
            var group = await _groups.Find(g => g.Id == id).FirstOrDefaultAsync();
            if (group == null) return NotFound();

            // Get all file IDs belonging to this project
            var projectFileIds = group.SharedDocumentIds ?? new List<string>();
            if (!projectFileIds.Any()) return Ok(new List<object>());

            // Get all SharedDocuments to extract their GridFS FileIds (used as part of TrackingID)
            var projectDocs = await _documents.Find(d => projectFileIds.Contains(d.Id)).ToListAsync();
            var gridFsFileIds = projectDocs.Select(d => d.FileId).Where(f => !string.IsNullOrEmpty(f)).ToList();

            // Query MonitorLogs for DocumentLeak/ClipboardCopy events matching these file IDs
            var monitorLogs = _groups.Database.GetCollection<MonitorLog>("MonitorLogs");
            
            var leakFilter = Builders<MonitorLog>.Filter.Or(
                Builders<MonitorLog>.Filter.Eq("logType", "DocumentLeak"),
                Builders<MonitorLog>.Filter.Eq("logType", "ClipboardCopy")
            );

            var recentLeaks = await monitorLogs.Find(leakFilter)
                .SortByDescending(l => l.Timestamp)
                .Limit(limit)
                .ToListAsync();

            // Filter by matching tracking IDs that contain project file IDs
            var matchedLeaks = recentLeaks.Where(leak =>
            {
                if (string.IsNullOrEmpty(leak.DetectedKeyword)) return false;
                return gridFsFileIds.Any(fid => leak.DetectedKeyword.Contains(fid));
            }).Select(leak => new 
            {
                id = leak.Id,
                type = leak.LogType,
                severity = leak.SeverityScore,
                message = leak.MessageContext,
                app = leak.ApplicationName,
                user = leak.ComputerUser,
                machine = leak.ComputerName,
                timestamp = leak.Timestamp
            }).ToList();

            return Ok(matchedLeaks);
        }
    }

    public class CreateTaskRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? AssignedTo { get; set; }
        public string? Status { get; set; }
        public string? Priority { get; set; }
        public DateTime? Deadline { get; set; }
    }

    public class CreateGroupRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? Type { get; set; }
        public string? Privacy { get; set; }
        public List<string>? MemberIds { get; set; }
        public bool IsProject { get; set; }
        public DateTime? ProjectStartDate { get; set; }
        public DateTime? ProjectEndDate { get; set; }
    }

    public class UpdateGroupRequest
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public DateTime? ProjectStartDate { get; set; }
        public DateTime? ProjectEndDate { get; set; }
    }
}
