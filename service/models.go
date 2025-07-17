package service

import "time"

type Parcel struct {
	ID        uint `gorm:"primarykey"`
	CreatedAt time.Time
	UpdatedAt time.Time
	Favorite  bool
	Content   string
}

type Attachment struct {
	ID          uint `gorm:"primarykey"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	ParcelID    uint
	ContentType string
	FileSize    int64
	FileName    string
	FilePath    string
}
