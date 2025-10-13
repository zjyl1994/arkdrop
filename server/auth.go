package server

import (
	"crypto/subtle"
	"time"

	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/zjyl1994/arkdrop/vars"
	"github.com/zjyl1994/cap-go"
)

func LoginHandler(c *fiber.Ctx) error {
	inputPass := c.FormValue("password")
	remember := c.FormValue("remember")
	capToken := c.FormValue("cap_token")

	// 验证CAP令牌
	if capToken == "" || !vars.CapInstance.ValidateToken(capToken, false) {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	if subtle.ConstantTimeCompare([]byte(inputPass), []byte(vars.Password)) == 0 {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	// Default token expire duration
	expireDuration := vars.JWT_TOKEN_EXPIRE
	// If remember me is enabled, extend to one year
	if remember == "1" || remember == "true" {
		expireDuration = 365 * 24 * time.Hour
	}
	exp := time.Now().Add(expireDuration)
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
		MaxAge:  int(expireDuration.Seconds()),
	})
	return c.SendString(tokenString)
}

func AuthMiddleware() fiber.Handler {
	return jwtware.New(jwtware.Config{
		Filter: func(c *fiber.Ctx) bool {
			path := c.Path()
			return path == "/api/login" || path == "/api/health" || path == "/api/cap/challenge" || path == "/api/cap/redeem"
		},
		SigningKey:  jwtware.SigningKey{Key: []byte(vars.Password)},
		TokenLookup: "header:Authorization,query:token,cookie:droptoken",
	})
}

func CreateChallenge(c *fiber.Ctx) error {
	challenge := vars.CapInstance.CreateChallenge(nil)
	return c.JSON(challenge)
}

func RedeemChallenge(c *fiber.Ctx) error {
	var body cap.Solution
	err := c.BodyParser(&body)
	if err != nil {
		return err
	}
	resp := vars.CapInstance.RedeemChallenge(&body)
	return c.JSON(resp)
}
