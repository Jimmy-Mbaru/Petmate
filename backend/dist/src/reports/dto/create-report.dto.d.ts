export declare enum ReportReason {
    SPAM = "spam",
    HARASSMENT = "harassment",
    FAKE_PROFILE = "fake_profile",
    INAPPROPRIATE_CONTENT = "inappropriate_content",
    SCAM = "scam",
    UNDERAGE = "underage",
    OTHER = "other"
}
export declare enum ReportStatus {
    PENDING = "pending",
    UNDER_REVIEW = "under_review",
    RESOLVED = "resolved",
    DISMISSED = "dismissed",
    ACTION_TAKEN = "action_taken"
}
export declare class CreateReportDto {
    reportedUserId: string;
    reason: ReportReason;
    description: string;
}
export declare class UpdateReportDto {
    status?: ReportStatus;
    adminNotes?: string;
}
