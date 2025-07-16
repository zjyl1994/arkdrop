package server

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sirupsen/logrus"
)

func Run(listen string) error {
	app := fiber.New(fiber.Config{
		DisableStartupMessage: true,
	})
	logrus.Infoln("PicoTransfer running on", listen)
	return app.Listen(listen)
}
