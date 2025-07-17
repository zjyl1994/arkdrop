package server

import (
	"path/filepath"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/zjyl1994/arkdrop/service"
	"github.com/zjyl1994/arkdrop/utils"
	"github.com/zjyl1994/arkdrop/vars"
)

var parcelService service.ParcelService

func CreateParcel(c *fiber.Ctx) error {
	form, err := c.MultipartForm()
	if err != nil {
		return err
	}
	files := form.File["files"]
	var attachments []service.Attachment
	now := time.Now().Unix()
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
	parcels, err := parcelService.List()
	if err != nil {
		return err
	}
	return c.JSON(parcels)
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
	err := parcelService.Clean()
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
