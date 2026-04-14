package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/zjyl1994/arkdrop/utils"
	"github.com/zjyl1994/arkdrop/vars"
	"gorm.io/gorm"
)

const (
	attachmentShareTokenLength      = 12
	attachmentShareTokenMaxAttempts = 8
)

func createAttachmentShare(attachmentID int, expiresAt int64) (AttachmentShare, error) {
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
		} else if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			continue
		} else {
			return AttachmentShare{}, err
		}
	}

	return AttachmentShare{}, fmt.Errorf("failed to create unique attachment share token")
}

func (ParcelService) GetOrCreateAttachmentShare(attachmentID int, expiresAt int64) (AttachmentShare, error) {
	now := time.Now().Unix()

	if err := vars.DB.Where("attachment_id = ? AND expires_at <= ?", attachmentID, now).Delete(&AttachmentShare{}).Error; err != nil {
		return AttachmentShare{}, err
	}

	var share AttachmentShare
	err := vars.DB.Where("attachment_id = ? AND expires_at > ?", attachmentID, now).Order("expires_at DESC").First(&share).Error
	if err == nil {
		if expiresAt != share.ExpiresAt {
			share.ExpiresAt = expiresAt
			if updateErr := vars.DB.Model(&share).Update("expires_at", expiresAt).Error; updateErr != nil {
				return AttachmentShare{}, updateErr
			}
		}
		return share, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return AttachmentShare{}, err
	}

	return createAttachmentShare(attachmentID, expiresAt)
}

func (ParcelService) CleanExpiredAttachmentShares() error {
	return vars.DB.Where("expires_at <= ?", time.Now().Unix()).Delete(&AttachmentShare{}).Error
}
