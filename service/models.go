package service

type Parcel struct {
	ID          int          `gorm:"primarykey" json:"id"`
	CreatedAt   int64        `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   int64        `gorm:"autoUpdateTime" json:"updated_at"`
	Favorite    bool         `json:"favorite"`
	Content     string       `json:"content"`
	Attachments []Attachment `json:"attachments"`
}

type Attachment struct {
	ID          int    `gorm:"primarykey" json:"id"`
	CreatedAt   int64  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   int64  `gorm:"autoUpdateTime" json:"updated_at"`
	ParcelID    int    `json:"parcel_id"`
	ContentType string `json:"content_type"`
	FileSize    int64  `json:"file_size"`
	FileName    string `json:"file_name"`
	FilePath    string `json:"file_path"`
}

type AttachmentShare struct {
	Token        string `gorm:"primarykey;size:16" json:"token"`
	CreatedAt    int64  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    int64  `gorm:"autoUpdateTime" json:"updated_at"`
	AttachmentID int    `gorm:"index" json:"attachment_id"`
	ExpiresAt    int64  `gorm:"index" json:"expires_at"`
}
