package server

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/zjyl1994/arkdrop/service"
	"github.com/zjyl1994/arkdrop/vars"
	"gorm.io/gorm"
)

func loadAttachmentWithParcel(id int) (service.Attachment, service.Parcel, error) {
	var attachment service.Attachment
	if err := vars.DB.First(&attachment, id).Error; err != nil {
		return service.Attachment{}, service.Parcel{}, err
	}

	var parcel service.Parcel
	if err := vars.DB.Select("id", "created_at", "favorite").First(&parcel, attachment.ParcelID).Error; err != nil {
		return service.Attachment{}, service.Parcel{}, err
	}

	return attachment, parcel, nil
}

func getAttachmentShareExpiresAt(parcel service.Parcel, now time.Time) int64 {
	expiresAt := now.Add(vars.AttachmentLinkExpire).Unix()
	if !parcel.Favorite {
		parcelExpiresAt := parcel.CreatedAt + int64(vars.AutoExpire.Seconds())
		if parcelExpiresAt < expiresAt {
			expiresAt = parcelExpiresAt
		}
	}
	return expiresAt
}

func CreateAttachmentShareLink(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Query("id"))
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "invalid attachment id",
		})
	}

	attachment, parcel, err := loadAttachmentWithParcel(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"message": "attachment not found",
			})
		}
		return err
	}

	now := time.Now()
	expiresAt := getAttachmentShareExpiresAt(parcel, now)
	if expiresAt <= now.Unix() {
		return c.Status(fiber.StatusGone).JSON(fiber.Map{
			"message": "attachment already expired",
		})
	}

	share, err := parcelService.GetOrCreateAttachmentShare(attachment.ID, expiresAt)
	if err != nil {
		return err
	}

	sharePath := fmt.Sprintf("/share/files/%s", share.Token)

	return c.JSON(fiber.Map{
		"path":               sharePath,
		"expires_at":         share.ExpiresAt,
		"expires_in_seconds": share.ExpiresAt - now.Unix(),
	})
}

func DownloadSharedAttachment(c *fiber.Ctx) error {
	token := c.Params("token")
	if token == "" {
		return c.Status(fiber.StatusBadRequest).SendString("missing share token")
	}

	var share service.AttachmentShare
	if err := vars.DB.First(&share, "token = ?", token).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).SendString("attachment not found")
		}
		return err
	}

	if time.Now().Unix() > share.ExpiresAt {
		_ = vars.DB.Delete(&share).Error
		return c.Status(fiber.StatusGone).SendString("link expired")
	}

	var attachment service.Attachment
	if err := vars.DB.First(&attachment, share.AttachmentID).Error; err != nil {
		_ = vars.DB.Delete(&share).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).SendString("attachment not found")
		}
		return err
	}

	diskPath := filepath.Join(vars.DataDir, "files", attachment.FilePath)
	if _, err := os.Stat(diskPath); err != nil {
		_ = vars.DB.Delete(&share).Error
		if errors.Is(err, os.ErrNotExist) {
			return c.Status(fiber.StatusNotFound).SendString("attachment not found")
		}
		return err
	}

	c.Set(fiber.HeaderCacheControl, "private, no-store, max-age=0")
	if attachment.ContentType != "" {
		c.Set(fiber.HeaderContentType, attachment.ContentType)
	}

	return c.Download(diskPath, attachment.FileName)
}
