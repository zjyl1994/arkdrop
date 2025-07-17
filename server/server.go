package server

import (
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/sirupsen/logrus"
	"github.com/zjyl1994/picotransfer/vars"
)

func Run(listen string) error {
	app := fiber.New(fiber.Config{
		DisableStartupMessage: true,
		BodyLimit:             10 * 1024 * 1024,
	})
	app.Static("/files", filepath.Join(vars.DataDir, "files"), fiber.Static{
		MaxAge: int(vars.AutoExpire.Seconds()),
	})
	logrus.Infoln("PicoTransfer running on", listen)
	return app.Listen(listen)
}
