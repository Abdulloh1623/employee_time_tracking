package com.timegate.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    private String channel = "push";    // push (in-app) | email | sms | telegram

    private String title;

    @Column(columnDefinition = "text")
    private String body;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;

    @PrePersist
    void onCreate() { if (sentAt == null) sentAt = OffsetDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long v) { this.userId = v; }
    public String getChannel() { return channel; }
    public void setChannel(String v) { this.channel = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getBody() { return body; }
    public void setBody(String v) { this.body = v; }
    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean v) { this.isRead = v; }
    public OffsetDateTime getSentAt() { return sentAt; }
    public void setSentAt(OffsetDateTime v) { this.sentAt = v; }
}
