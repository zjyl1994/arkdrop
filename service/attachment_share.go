package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/zjyl1994/arkdrop/utils"
	"github.com/zjyl1994/arkdrop/vars"
	"gorm.io/gorm"
)

const (
	attachmentShareTokenLength      = 12
	attachmentShareTokenMaxAttempts = 8
)

func (ParcelService) CreateAttachmentShare(attachmentID int, expiresAt int64) (AttachmentShare, error) {
	share := AttachmentShare{
		AttachmentID: attachmentID,
		ExpiresAt:    expiresAt,
	}

	for attempt := 0; attempt < attachmentShareTokenMaxAttempts; attempt++ {
		token := utils.RandString(attachmentShareTokenLength)

		var existing AttachmentShare
		err := vars.DB.Select("token").First(&existing, "token = ?", token).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return AttachmentShare{}, err
		}

		share.Token = token
		if err := vars.DB.Create(&share).Error; err == nil {
			return share, nil
		}
	}

	return AttachmentShare{}, fmt.Errorf("failed to create unique attachment share token")
}

func (ParcelService) CleanExpiredAttachmentShares() error {
	return vars.DB.Where("expires_at <= ?", time.Now().Unix()).Delete(&AttachmentShare{}).Error
}
