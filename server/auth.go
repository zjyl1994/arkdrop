package server

import (
	"crypto/subtle"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/zjyl1994/arkdrop/vars"
)

func LoginHandler(c *fiber.Ctx) error {
	inputPass := c.FormValue("password")

	if subtle.ConstantTimeCompare([]byte(inputPass), []byte(vars.Password)) == 0 {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256,
		jwt.MapClaims{
			"exp": time.Now().Add(vars.JWT_TOKEN_EXPIRE).Unix(),
		})

	tokenString, err := token.SignedString([]byte(vars.Password))
	if err != nil {
		return err
	}

	return c.SendString(tokenString)
}
