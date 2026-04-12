package server

import (
	"errors"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/zjyl1994/arkdrop/service"
	"github.com/zjyl1994/arkdrop/utils"
	"github.com/zjyl1994/arkdrop/vars"
	"gorm.io/gorm"
)

var parcelService service.ParcelService

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

	return c.JSON(fiber.Map{
		"id": parcel.ID,
	})
}

func AddParcelAttachment(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Query("id"))
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "invalid parcel id",
		})
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

	attachments, savedPaths, err := saveAttachments(c, files)
	if err != nil {
		return err
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

	return c.JSON(fiber.Map{
		"count": len(attachments),
	})
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
