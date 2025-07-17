package server

import (
	"crypto/subtle"
	"time"

	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/zjyl1994/arkdrop/vars"
)

func LoginHandler(c *fiber.Ctx) error {
	inputPass := c.FormValue("password")

	if subtle.ConstantTimeCompare([]byte(inputPass), []byte(vars.Password)) == 0 {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	exp := time.Now().Add(vars.JWT_TOKEN_EXPIRE)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256,
		jwt.MapClaims{
			"exp": exp.Unix(),
		})

	tokenString, err := token.SignedString([]byte(vars.Password))
	if err != nil {
		return err
	}
	c.Cookie(&fiber.Cookie{
		Name:    "droptoken",
		Value:   tokenString,
		Expires: exp,
	})
	return c.SendString(tokenString)
}

func AuthMiddleware() fiber.Handler {
	return jwtware.New(jwtware.Config{
		Filter: func(c *fiber.Ctx) bool {
			path := c.Path()
			return path == "/api/login" || path == "/api/health"
		},
		SigningKey:  jwtware.SigningKey{Key: []byte(vars.Password)},
		TokenLookup: "header:Authorization,query:token,cookie:droptoken",
	})
}
