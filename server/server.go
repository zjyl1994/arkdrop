package server

import (
	"net/http"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/sirupsen/logrus"
	"github.com/zjyl1994/arkdrop/vars"
	"github.com/zjyl1994/arkdrop/webui"
)

func Run(listen string) error {
	app := fiber.New(fiber.Config{
		DisableStartupMessage: true,
		BodyLimit:             10 * 1024 * 1024,
	})

	apiGroup := app.Group("/api", AuthMiddleware())
	apiGroup.Get("/health", HealthHandler)
	apiGroup.Post("/login", LoginHandler)
	apiGroup.Post("/create", CreateParcel)
	apiGroup.Post("/delete", DeleteParcel)
	apiGroup.Post("/clean", CleanParcel)
	apiGroup.Get("/list", ListParcel)
	apiGroup.Post("/favorite", FavoriteParcel)

	app.Use("/files", AuthMiddleware())
	app.Static("/files", filepath.Join(vars.DataDir, "files"), fiber.Static{
		MaxAge:    int(vars.AutoExpire.Seconds()),
		ByteRange: true,
	})

	app.Use("/", filesystem.New(filesystem.Config{
		Root:         http.FS(webui.WebUI),
		PathPrefix:   "dist",
		NotFoundFile: "dist/index.html",
		MaxAge:       int(vars.JWT_TOKEN_EXPIRE.Seconds()),
	}))
	logrus.Infoln("ArkDrop running on", listen)
	return app.Listen(listen)
}

func HealthHandler(c *fiber.Ctx) error {
	return c.SendString("♜ ArkDrop")
}
