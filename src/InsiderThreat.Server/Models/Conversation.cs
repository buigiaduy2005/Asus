using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

namespace InsiderThreat.Server.Models
{
    public class Conversation
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("participantIds")]
        public List<string> ParticipantIds { get; set; } = new List<string>();

        [BsonElement("type")]
        public string Type { get; set; } = "direct"; // direct, group

        [BsonElement("groupName")]
        public string? GroupName { get; set; }

        [BsonElement("groupAvatarUrl")]
        public string? GroupAvatarUrl { get; set; }

        [BsonElement("lastMessageId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? LastMessageId { get; set; }

        [BsonElement("lastMessagePreview")]
        public string? LastMessagePreview { get; set; }

        [BsonElement("lastActivity")]
        public DateTime LastActivity { get; set; } = DateTime.UtcNow;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Message
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("conversationId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ConversationId { get; set; } = string.Empty;

        [BsonElement("senderId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string SenderId { get; set; } = string.Empty;

        [BsonElement("senderName")]
        public string SenderName { get; set; } = string.Empty;

        [BsonElement("content")]
        public string Content { get; set; } = string.Empty;

        [BsonElement("attachments")]
        public List<MediaFile> Attachments { get; set; } = new List<MediaFile>();

        [BsonElement("isEncrypted")]
        public bool IsEncrypted { get; set; } = false;

        [BsonElement("readBy")]
        public List<string> ReadBy { get; set; } = new List<string>();

        [BsonElement("replyToMessageId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? ReplyToMessageId { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
