package server

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/zjyl1994/arkdrop/service"
	"github.com/zjyl1994/arkdrop/vars"
	"gorm.io/gorm"
)

// FileCacheHeaders bounds both HTTP and service-worker caches by the parcel lifetime.
func FileCacheHeaders(c *fiber.Ctx) error {
	path := strings.TrimPrefix(c.Path(), "/files/")
	var attachment service.Attachment
	if err := vars.DB.Where("file_path = ?", path).First(&attachment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fiber.ErrNotFound
		}
		return err
	}
	parcel, err := liveParcel(attachment.ParcelID)
	if err != nil {
		return err
	}
	expiresAt := parcelExpiry(parcel)
	if err := c.Next(); err != nil {
		return err
	}
	c.Set("X-ArkDrop-Expires-At", strconv.FormatInt(expiresAt*1000, 10))
	c.Set(fiber.HeaderCacheControl, "private, max-age="+strconv.FormatInt(max(0, expiresAt-time.Now().Unix()), 10))
	return nil
}
