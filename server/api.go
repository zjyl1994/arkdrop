package server

import (
	"errors"
	"mime/multipart"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/zjyl1994/arkdrop/service"
	"github.com/zjyl1994/arkdrop/utils"
	"github.com/zjyl1994/arkdrop/vars"
	"gorm.io/gorm"
)

var parcelService service.ParcelService

var uploadKeyPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{16,80}$`)

func uploadKey(c *fiber.Ctx) (*string, error) {
	key := c.Get("X-Upload-Key")
	if key == "" {
		return nil, nil
	}
	if !uploadKeyPattern.MatchString(key) {
		return nil, fiber.NewError(fiber.StatusBadRequest, "invalid upload key")
	}
	return &key, nil
}

func parcelExpiry(parcel service.Parcel) int64 {
	if parcel.Favorite || vars.AutoExpire <= 0 {
		return time.Now().Add(24 * time.Hour).Unix()
	}
	return parcel.CreatedAt + int64(vars.AutoExpire.Seconds())
}

func liveParcel(id int) (service.Parcel, error) {
	var parcel service.Parcel
	if err := vars.DB.First(&parcel, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return parcel, fiber.NewError(fiber.StatusNotFound, "parcel not found")
		}
		return parcel, err
	}
	if parcelExpiry(parcel) <= time.Now().Unix() {
		return parcel, fiber.NewError(fiber.StatusGone, "parcel expired")
	}
	return parcel, nil
}

func uploadResponse(c *fiber.Ctx, parcel service.Parcel, attachments []service.Attachment) error {
	return c.JSON(fiber.Map{"count": len(attachments), "attachments": attachments, "expires_at": parcelExpiry(parcel)})
}

// AttachmentUploadStatus lets retries confirm a lost response before resending a file.
func AttachmentUploadStatus(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Query("id"))
	if err != nil || id <= 0 {
		return fiber.NewError(fiber.StatusBadRequest, "invalid parcel id")
	}
	key, err := uploadKey(c)
	if err != nil {
		return err
	}
	if key == nil {
		return fiber.NewError(fiber.StatusBadRequest, "missing upload key")
	}
	parcel, err := liveParcel(id)
	if err != nil {
		return err
	}
	attachment, err := parcelService.AttachmentUpload(id, *key)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return c.JSON(fiber.Map{"attachments": []service.Attachment{}, "expires_at": parcelExpiry(parcel)})
	}
	if err != nil {
		return err
	}
	return uploadResponse(c, parcel, []service.Attachment{attachment})
}

func buildAttachment(file *multipart.FileHeader, now int64) service.Attachment {
	return service.Attachment{
		ContentType: file.Header.Get("Content-Type"),
		FileSize:    file.Size,
		FileName:    file.Filename,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

func saveAttachments(c *fiber.Ctx, files []*multipart.FileHeader) ([]service.Attachment, []string, error) {
	attachments := make([]service.Attachment, 0, len(files))
	savedPaths := make([]string, 0, len(files))
	now := time.Now().Unix()

	for _, file := range files {
		if file == nil {
			continue
		}

		diskFileName := utils.RandString(10) + filepath.Ext(file.Filename)
		diskPath := filepath.Join(vars.DataDir, "files", diskFileName)
		if err := c.SaveFile(file, diskPath); err != nil {
			for _, savedPath := range savedPaths {
				_ = os.Remove(savedPath)
			}
			return nil, nil, err
		}

		attachment := buildAttachment(file, now)
		attachment.FilePath = diskFileName
		attachments = append(attachments, attachment)
		savedPaths = append(savedPaths, diskPath)
	}

	return attachments, savedPaths, nil
}

func cleanupSavedFiles(savedPaths []string) {
	for _, savedPath := range savedPaths {
		_ = os.Remove(savedPath)
	}
}

func parseOptionalBoolQuery(c *fiber.Ctx, key string) (*bool, error) {
	rawValue := c.Query(key)
	if rawValue == "" {
		return nil, nil
	}

	parsedValue, err := strconv.ParseBool(rawValue)
	if err != nil {
		return nil, err
	}

	return &parsedValue, nil
}

func CreateParcel(c *fiber.Ctx) (err error) {
	var parcel service.Parcel
	parcel.UploadKey, err = uploadKey(c)
	if err != nil {
		return err
	}
	parcel.Content = c.FormValue("content")
	rawFavorite := c.FormValue("favorite")
	if rawFavorite != "" {
		parcel.Favorite, err = strconv.ParseBool(rawFavorite)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"message": "invalid favorite value",
			})
		}
	}
	now := time.Now().Unix()
	parcel.CreatedAt = now
	parcel.UpdatedAt = now

	parcel, err = parcelService.Create(parcel)
	if err != nil {
		return err
	}

	if parcelExpiry(parcel) <= time.Now().Unix() {
		return fiber.NewError(fiber.StatusGone, "parcel expired")
	}
	return c.JSON(fiber.Map{
		"id":         parcel.ID,
		"expires_at": parcelExpiry(parcel),
	})
}

func AddParcelAttachment(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Query("id"))
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "invalid parcel id",
		})
	}

	parcel, err := liveParcel(id)
	if err != nil {
		return err
	}
	key, err := uploadKey(c)
	if err != nil {
		return err
	}
	if key != nil {
		attachment, err := parcelService.AttachmentUpload(id, *key)
		if err == nil {
			return uploadResponse(c, parcel, []service.Attachment{attachment})
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
	}
	form, err := c.MultipartForm()
	if err != nil {
		return err
	}

	files := append(form.File["file"], form.File["files"]...)
	if len(files) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "missing file",
		})
	}

	if key != nil && len(files) != 1 {
		return fiber.NewError(fiber.StatusBadRequest, "keyed uploads require one file")
	}
	attachments, savedPaths, err := saveAttachments(c, files)
	if err != nil {
		return err
	}

	if key != nil {
		attachments[0].UploadKey = key
		attachment, reused, err := parcelService.AddAttachmentOnce(id, attachments[0])
		if reused || err != nil {
			cleanupSavedFiles(savedPaths)
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "parcel not found")
		}
		if err != nil {
			return err
		}
		return uploadResponse(c, parcel, []service.Attachment{attachment})
	}
	err = parcelService.AddAttachments(id, attachments)
	if err != nil {
		cleanupSavedFiles(savedPaths)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"message": "parcel not found",
			})
		}
		return err
	}

	return uploadResponse(c, parcel, attachments)
}

func ListParcel(c *fiber.Ctx) error {
	favorite, err := parseOptionalBoolQuery(c, "favorite")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "invalid favorite filter",
		})
	}

	parcels, err := parcelService.List(favorite)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{
		"expire_seconds": int(vars.AutoExpire.Seconds()),
		"list":           parcels,
	})
}

func DeleteParcel(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Query("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}
	err = parcelService.Delete(id)
	if err != nil {
		return err
	}
	return c.SendString("OK")
}

func CleanParcel(c *fiber.Ctx) error {
	favorite, err := parseOptionalBoolQuery(c, "favorite")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "invalid favorite filter",
		})
	}

	shouldCleanFavorite := false
	if favorite != nil {
		shouldCleanFavorite = *favorite
	}

	err = parcelService.Clean(shouldCleanFavorite)
	if err != nil {
		return err
	}
	return c.SendString("OK")
}

func FavoriteParcel(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Query("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}
	err = parcelService.Favorite(id)
	if err != nil {
		return err
	}
	return c.SendString("OK")
}
