package vars

import (
	"time"

	"gorm.io/gorm"
)

var (
	ListenAddr string
	DataDir    string
	DebugMode  bool
	Password   string
	AutoExpire time.Duration

	DB *gorm.DB
)

const (
	JWT_TOKEN_EXPIRE = 24 * 30 * time.Hour
)
