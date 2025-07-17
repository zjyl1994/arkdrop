package server

import (
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/zjyl1994/picotransfer/service"
	"github.com/zjyl1994/picotransfer/utils"
	"github.com/zjyl1994/picotransfer/vars"
)

var parcelService service.ParcelService

func CreateParcel(c *fiber.Ctx) error {
	form, err := c.MultipartForm()
	if err != nil {
		return err
	}
	files := form.File["files"]
	var attachments []service.Attachment
	now := time.Now()
	for _, file := range files {
		diskFileName := utils.RandString(10) + filepath.Ext(file.Filename)
		diskPath := filepath.Join(vars.DataDir, "files", diskFileName)
		if err := c.SaveFile(file, diskPath); err != nil {
			return err
		}
		attachments = append(attachments, service.Attachment{
			ContentType: file.Header.Get("Content-Type"),
			FileSize:    file.Size,
			FileName:    file.Filename,
			FilePath:    diskFileName,
			CreatedAt:   now,
			UpdatedAt:   now,
		})
	}
	var parcel service.Parcel
	parcel.Content = c.FormValue("content")
	parcel.CreatedAt = now
	parcel.UpdatedAt = now

	err = parcelService.Create(parcel, attachments)
	if err != nil {
		return err
	}

	return c.SendString("OK")
}

func ListParcel(c *fiber.Ctx) error {
	return c.SendString("TODO")
}

func DeleteParcel(c *fiber.Ctx) error {
	return c.SendString("TODO")
}

func CleanParcel(c *fiber.Ctx) error {
	return c.SendString("TODO")
}
