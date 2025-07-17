package server

import (
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/sirupsen/logrus"
	"github.com/zjyl1994/arkdrop/vars"
)

func Run(listen string) error {
	app := fiber.New(fiber.Config{
		DisableStartupMessage: true,
		BodyLimit:             10 * 1024 * 1024,
	})
	apiGroup := app.Group("/api")
	apiGroup.Post("/create", CreateParcel)
	apiGroup.Post("/delete", DeleteParcel)
	apiGroup.Post("/clean", CleanParcel)
	apiGroup.Get("/list", ListParcel)
	apiGroup.Post("/favorite", FavoriteParcel)

	app.Static("/files", filepath.Join(vars.DataDir, "files"), fiber.Static{
		MaxAge:    int(vars.AutoExpire.Seconds()),
		ByteRange: true,
	})
	logrus.Infoln("PicoTransfer running on", listen)
	return app.Listen(listen)
}
